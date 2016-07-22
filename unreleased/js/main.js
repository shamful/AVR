$(document).ready(main);

var listName = "Abandoned-Vehicle-Reports";

// file reader globals
var filereader = {},
    file = {},
    i=0;
// list of attachments
var attachments = [];

// Define list of sharepoint internal field names
var dataFields = [
    ["Report_x0020_Type"],
    ["Housing_x0020_Area"],
    ["Estate"],
    ["Block"],
    ["Other_x0020_Location_x0020_Infor"],
    ["Vehicle_x0020_Type"],
    ["Vehicle_x0020_Registration_x0020"],
    ["Vehicle_x0020_Make"],
    ["Vehicle_x0020_Model"],
    ["Vehicle_x0020_Color"],
    ["Vehicle_x0020_Condition"],
    ["Tax_x0020_Disc_x0020_Expiry_x002"],
    ["Notice_x0020_Placed_x0020_On"],
    ["Owner_x0020_Name"],
    ["Owner_x0020_Address"]
];

//    ["Second_x0020_Inspection_x0020_Up", "Pending"]  //DISPLAY THIS ON SECOND FORM??
// Fields not needed...
//        ["Second_x0020_Inspection_x0020_Da", dateTest],  CALCULATED FIELD SETUP IN SHAREPOINT
//        ["Requested_x0020_Removal_x0020_On", dateTest],  // FOR ESTATE PARKING
//        ["Vehicle_x0020_Removed_x0020_On", dateTest],  // FOR ESTATE PARKING
//        ["Vehicle_x0020_Removed_x0020_with", "20"]   // RMEOVED WITHIN 24HRS?  FOR ESTATE PARKING

// code from http://stackoverflow.com/questions/6539761/window-location-search-query-as-json
// convert url paramstsers / query string ot object
function paramsToObject() {
  var pairs = window.location.search.substring(1).split("&"),
    obj = {},
    pair,
    i;

  for ( i in pairs ) {
    if ( pairs[i] === "" ) continue;

    pair = pairs[i].split("=");
    obj[ decodeURIComponent( pair[0] ) ] = decodeURIComponent( pair[1] );
  }

  return obj;
}

jQuery( function( $ ) {
    
    // Code from: http://stackoverflow.com/questions/1878264/how-do-i-make-an-html-button-not-reload-the-page
    // Required at least one of two or more inputs
    // validation
    var $inputs = $( 'input[name=estateName],input[name=blockName]' );
    $inputs.on( 'input', function() {
        // Sets the required property of the other input to false if this input is not empty.
        $inputs.not( this ).prop( 'required', !$( this ).val().length );
    } );
    
} );


function main(){
    // get url params and convetr to object
    var urlParams = paramsToObject();
    console.log(urlParams);
    
    // signed in as username
    var user = $().SPServices.SPGetCurrentUser({
      fieldName: "Title",
      debug: false
    });
    user = user.split(", ")[1] +" "+ user.split(", ")[0];
    $('#user span').text(user);
    
    //Load page depending on url params
    // check id is more than 1 and not undefined
    if(urlParams.id > 0 && urlParams.id !== "undefined"){
        // check edit param exists to show editing form, else show read only form
        if(urlParams.edit){
            console.log("get data and show in editable form");
        } else {
            $('#sections').load("viewReport.html", function(){
                $('#viewReportHeading > span').text(urlParams.id);
                viewReport(urlParams.id);
            });
        }
    } else {
        $('#sections').load("newReport.html", function(){
            prepNewForm();
            newFormEvents();
        });
    }
}

function viewReport(itemId){
    
    // use id to get data from sp
    $().SPServices({
        operation: "GetListItems",
        listName: listName,
        CAMLQuery: "<Query><Where><Eq><FieldRef Name='ID'/><Value Type='Text'>"+itemId+"</Value></Eq></Where></Query>",
        completefunc: function(xData, Status){
            var json = $(xData.responseXML).SPFilterNode("z:row").SPXmlToJson({
                includeAllAttrs: true
            });
            
            // Fix created by field
            json[0].Author = json[0].Author.split('#')[1];
            json[0].Author = json[0].Author.split(', ')[1] +" "+ json[0].Author.split(', ')[0];
            // Remove time from dates
            json[0].Notice_x0020_Placed_x0020_On = json[0].Notice_x0020_Placed_x0020_On.split(" ")[0];
            json[0].Tax_x0020_Disc_x0020_Expiry_x002 = json[0].Tax_x0020_Disc_x0020_Expiry_x002.split(" ")[0];
            json[0].Second_x0020_Inspection_x0020_Da = json[0].Second_x0020_Inspection_x0020_Da.split('#')[1].split(' ')[0];
            
            console.log(json);
            // populate dom
            // report type
            $('#reportedBy').text(json[0].Author);
            $('#reportType').text(json[0].Report_x0020_Type);
            // location
            $('#housingArea').text(json[0].Housing_x0020_Area);
            $('#estate').text(json[0].Estate);
            $('#block').text(json[0].Block);
            $('#access').text(json[0].Other_x0020_Location_x0020_Infor);
            // vehicle and notice
            $('#vehicleType').text( json[0].Vehicle_x0020_Type );
            $('#vrn').text(json[0].Vehicle_x0020_Registration_x0020.slice(0, 4) +" "+ json[0].Vehicle_x0020_Registration_x0020.slice(4));
            $('#vehicleMake').text(json[0].Vehicle_x0020_Make);
            $('#vehicleModel').text(json[0].Vehicle_x0020_Model);
            $('#vehicleColor').text(json[0].Vehicle_x0020_Color);
            $('#vehicleCondition').text(json[0].Vehicle_x0020_Condition);
            $('#taxExpiryDate').text(json[0].Tax_x0020_Disc_x0020_Expiry_x002);
            $('#noticePlacedOn').text(json[0].Notice_x0020_Placed_x0020_On);
            $('#secondInspectionDate').text(json[0].Second_x0020_Inspection_x0020_Da);
            $('#inspectionNotice').text(json[0].Second_x0020_Inspection_x0020_Da);
            // Vehicle Owner
            $('#ownerName').text(json[0].Owner_x0020_Name);
            $('#ownerAddress').text(json[0].Owner_x0020_Address);
            
            $('#edit').attr('href', "index.html?id="+itemId+"&edit");
            
            // Attachments
            getAttachmentFiles(listName, itemId, printAttachments);
            
            function printAttachments(urls){
                for(var i =0; i< urls.length; i++){  
                    filename = urls[i].split('/').pop()
                    $('#attachments').append("<a href='"+urls[i]+"' target='_new'>"+filename+"</a><br>");
                };    
            }
            
        }
    });
}

function getAttachmentFiles(listName,listItemId,complete) 
{
   $().SPServices({
        operation: "GetAttachmentCollection",
        async: false,
        listName: listName,
        ID: listItemId,
        completefunc: function(xData, Status) {
            var attachmentFileUrls = [];    
            $(xData.responseXML).find("Attachment").each(function() {
               var url = $(this).text();
               attachmentFileUrls.push(url);
            });
            complete(attachmentFileUrls);
        }
   });
}


function newFormEvents(){
    
    // show / hide report type hints
    $('input[name="reportType"]').change( function(){
        // get index of selected radio button
        var selected = $('input[name="reportType"]').index(this);
        // hide all hints
        $('#reportType #hints span').hide();
        // select and show hint using radio button index 
        $('#reportType #hints span').eq(selected).slideDown(100);
    });
    
    // when user adds file/s get them and store in array => an array of file objects
    $('#inputAttachment-1').change( function(){
        var files = $(this)[0].files;
        console.log(files);
        for(var i=0; i<files.length; i++){
            console.log(files[i]);
            attachments.push(files[i]);
            $('#filesCached ol').append('<li>'+files[i].name+'</li>');
            
        }
        
        
        
//        attachments.push(files); 
        console.log(attachments);
        
    });
    
    // when user clicks submit, check form data and send to SP list
    $('#newReportForm').submit( function(){
        // populate loader text
        $('.loader-text').text('Sending data');

        $('#newReport').fadeOut(100);

        $('.loader-container').fadeIn(100);
            // get form data and join to global SP fields list array
            getFormData( function(){  
                // idk if i really need a callback, maybe just because i have global datafields ?
                sendToSP();
        });
        // prevent page refresh
        return false; 
    });
}

function prepNewForm(){
    // Disable autocomplete
    $('input[type="text"]').attr('autocomplete','off');
    
    window.attachmentsInput = $('input[type="file"]').fileinput({
        allowedFileExtensions: ["png", "jpg", "jpeg", "bmp", "gif", "pdf", "doc", "docx"],
        overwriteInitial: false,
        allowFullScreen: false,
        showUpload: false,
        showPreview: false,
        layoutTemplates: {
            main1:
            "<div class=\'input-group {class}\'>\n" +
            "   <div class=\'input-group-btn\'>\n" +
            "       {browse}\n" +
            "       {remove}\n" +
            "   </div>\n" +
            "   {caption}\n" +
            "</div>"+
             "{preview}\n"
        },
        fileActionSettings: { // hide not uploaded yet / hand down indicator
            indicatorNew: '',
            indicatorNewTitle: ''
        }
    });
        
    
    // get estate names from estate boundary layer
    $.ajax({
        url: "http://giswmsint:8080/geoserver/Oracle.Spatial/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=Oracle.Spatial:Estate-Boundaries&outputFormat=text%2Fjavascript&format_options=callback:estates",
        jsonpCallback: "estates",
        dataType: "jsonp",
        success: function(data){
            var list = [];
            for( var i in data.features ) {
                list.push( data.features[i].properties.NAME );
            }
            
            var input = document.getElementById("estateName");
            new Awesomplete(input, {
                list: list
            });
        }
    });
    
    $.ajax({
        url: "http://giswmsdv01:8080/geoserver/Oracle.Spatial/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=Oracle.Spatial:HASS-BLOCKS&outputFormat=text%2Fjavascript&format_options=callback:blocks",
        jsonpCallback: "blocks",
        dataType: "jsonp",
        success: function(data){
            var list = [];
            for( var i in data.features ) {
                list.push( data.features[i].properties["BLOCK_NAME"] );
            }
            
            var input = document.getElementById("blockName");
            new Awesomplete(input, {
                list: list
            });
        }
    });


    // add date picker to all form controls with date class
    $('.form-control.date').datepicker({
        format: "dd/mm/yyyy",
        weekStart: 1,
        maxViewMode: 1,
        todayBtn: "linked",
        daysOfWeekDisabled: "0,6",
        daysOfWeekHighlighted: "0,6",
        autoclose: true,
        todayHighlight: true
    });
}


function getFormData(callback){    
    dataFields[0].push(   $('#reportType input:radio:checked').val()    ) ;
    dataFields[1].push(   $('#housingArea input:radio:checked').val()   );
    dataFields[2].push(   $('#estateName').val()   );
    dataFields[3].push(   $('#blockName').val()   );
    dataFields[4].push(   $('#accessInfo').val()   );
    
    dataFields[5].push(   $('#vehicleType input:radio:checked').val()   );
    // make upper case and remove spaces
    dataFields[6].push(   $('#vehicleReg').val().toUpperCase().replace(/\s/g, '')   );
    dataFields[7].push(   $('#vehicleMake').val()   );
    dataFields[8].push(   $('#vehicleModel').val()   );
    dataFields[9].push(   $('#vehicleColor').val()   );
    dataFields[10].push(   $('#vehicleCondition').val()   );
    
    // date fields
    var taxExpiryDate = convertDateFormat(  $('#taxExpiryDate').val() );
    var noticePlaced =  convertDateFormat(  $('#noticePlaced').val() );
    
    dataFields[11].push( taxExpiryDate );
    dataFields[12].push( noticePlaced );
    
    dataFields[13].push(   $('#ownerName').val()   );
    dataFields[14].push(   $('#ownerAddress').val()   );
    
    callback();
}


function postAttachments(listName,itemId,files){

    //loop over each file selected 
    // by adding one to i and calling this function after each attachment has uploaded
    file = files[i];

    filereader = new FileReader();
    filereader.filename = file.name;

    filereader.onload = function() {				
        var data = this.result,						
            n=data.indexOf(";base64,") + 8; 

        //removing the first part of the dataurl give us the base64 bytes we need to feed to sharepoint
        data= data.substring(n);
        var uploadedNum = 0;
        $().SPServices({
            operation: "AddAttachment",				
            listName: listName,
            asynch: false,
            listItemID:itemId,
            fileName: this.filename,
            attachment: data,
            completefunc: function (xData, Status) {

                var node = xData.responseXML.getElementsByTagName("AddAttachmentResult")[0].childNodes[0];

                // add 1 to index for next call of this function, acts as a loop
                i++; 
                $('.attCnt').text(i+" / "+files.length);
                if( i < files.length ){
                    postAttachments(listName, itemId, files);
                } else {
                    $('.loader-text').append(' <span class="glyphicon glyphicon-ok"></span>');
                    $('.loader-container').fadeOut(200, function(){
//                        $('#newReport').fadeIn(200);
                        window.location = "index.html?id="+itemId;
                    });
                }
            }
        });


    };

    filereader.onabort = function() {
        alert("The upload was aborted.");
    };

    filereader.onerror = function() {
        alert("An error occured while reading the file.");
    };

    //fire the onload function giving it the dataurl
    filereader.readAsDataURL(file);


};



function sendToSP(){    
    $().SPServices({
        operation: "UpdateListItems",
        async: true,
        batchCmd: "New",
        listName: listName,
        valuepairs: dataFields,
        completefunc: function(xData, Status) {
            $('.loader-text').append(' <span class="glyphicon glyphicon-ok"></span><br>Uploading attachments (<span class="attCnt"></span>)');
            // get item id
            var itemId = $(xData.responseXML).SPFilterNode("z:row").attr("ows_ID");
            
            // upload attachments to item id
            var files = $("#inputAttachment-1")[0].files;
//            var listName = "Abandoned-Vehicle-Reports";
//            postAttachments(listName,itemId,files);
            postAttachments(listName,itemId,attachments);
        }
    });
}

function convertDateFormat(date) {
// converting date from human format dd/mm/yyyy to toISOString format yyyy-mm-dd
    date = date.split('/');
    date = date[2]+"-"+date[1]+"-"+date[0];
//    console.log(date);
    return new Date( date ).toISOString();
}
