$(document).ready(main);

// globals
var listName = "abandonedVehicleReports";

// file reader
var filereader = {},
    file = {},
    i=0;
// list of attachments
var attachments = [],
    reportId,
    user,
    estateParkingTeam = ["Shamir Khan", "David Hutchison"];


function main(){
    // get url params and convetr to object
    var urlParams = paramsToObject();
    console.log(urlParams);
    
    reportId = urlParams.id;
    
    // show signed in as USERNAME
    user = $().SPServices.SPGetCurrentUser({
      fieldName: "Title",
      debug: false
    });
    user = user.split(", ")[1] +" "+ user.split(", ")[0];
    $('#user span').text(user);

    /* Load content depending on url params
         no params   => new report
         id=N        => view report
         id=N&edit   => edit report
    */
    // check id is more than 1 and not undefined and edit exists
    if(urlParams.edit && urlParams.id > 0 && urlParams.id !== "undefined"){
        // edit report using new form page
        $('#sections').load("form.html", function(){
            prepNewForm();
            newFormEvents(urlParams.id);
            readData(urlParams.id, "edit");
        });
    } else {
        if(urlParams.id > 0 && urlParams.id !== "undefined"){
            // view report
            $('#sections').load("viewReport.html", function(){
                $('#viewReportHeading > span').text(urlParams.id);
                readData(urlParams.id, "new");
                viewReportEvents();
            });
        } else {
            // new report
            $('#sections').load("form.html", function(){
                prepNewForm();
                newFormEvents();
                $('#sections').fadeIn(100);
            });
        }
    }
}

function paramsToObject() {
// code from http://stackoverflow.com/questions/6539761/window-location-search-query-as-json
// convert url paramstsers / query string ot object
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

function readData(itemId, formType){
    
    // disabled auto slide on carousels
    $('.carousel').carousel({
        interval: false
    }); 

    // use id to get data from sp
    $().SPServices({
        operation: "GetListItems",
        listName: listName,
        CAMLQuery: "<Query><Where><Eq><FieldRef Name='ID'/><Value Type='Text'>"+itemId+"</Value></Eq></Where></Query>",
        completefunc: function(xData, Status){
            var json = $(xData.responseXML).SPFilterNode("z:row").SPXmlToJson({
                includeAllAttrs: true
            });  
            console.log(json);
            
            $('#edit').attr('href', "index.html?id="+itemId+"&edit");
            
            if(formType === "new"){
                view(json, itemId);
            } else if( formType === "edit" ){
                edit(json, itemId);
            }
        }
    });
    
}

function edit(json, itemId){
    // prep data and display in editable form

    // hide notice for new forms
    $('.jumbotron.notice').hide();
    
    // change form name so different action occurs when submit clicked
    $('#newReportForm').attr('id','editForm');
    
    // change submit button to save
    $('#submit').attr('id','save').html('<i class="fa fa-floppy-o"></i>&nbsp; Save this report');
    
    // convert 1st inspection input into second inspection input
//    $('#1st-inspection')
//        .removeAttr('required')
//        .attr('id','2nd-inspection')
//        .next('label')
//        .attr('for', '2nd-inspection')
//        .text('Second Inspection Images');
    
    for( var prop in json[0]){
        // if property value in json contains Date, treat field as date
        // fix date for display in
        if( prop.indexOf("Date") > -1 ){
            var date = json[0][prop].split(" ")[0].split("-");
            json[0][prop] = date[2] +"/"+ date[1] +"/"+ date[0];
        }
    }

    // populate all text fields, selecting data in json using element id
    $('input[type="text"]').val( function(){
        return json[0][this.id];
    });
    
    // For each 3rd parent of radio input  
    $('input[type="radio"]').parent().parent().parent().each( function(){
        var vehicleTypes = ["Car","Van","Moped", "Motorcycle","Lorry"];
        
        // check if this element is vehicle type and value is not standard vehicle type
        if( this.id === "vehicleType" && vehicleTypes.indexOf( json[0][this.id] ) === -1  ){
                $('#vehicleTypeOther').val( json[0][this.id] ).slideDown(100);
                $('input[value="Other"]').prop('checked', true).parent().addClass('active');
        } else {
            // select data required using id of radio parent
            var value = json[0][this.id];
            // check each radio element using value from json to match value of input
            $('#'+this.id+' input[value="'+value+'"]').prop('checked', true).parent().addClass('active');        
        }
    });
    
    // display form wrapper
    $('#sections').fadeIn(100);
}

function view(json, itemId){
    // Prep data and display in DOM
    
    // Fix created by field
    json[0].Author = json[0].Author.split('#')[1];
    json[0].Author = json[0].Author.split(', ')[1] +" "+ json[0].Author.split(', ')[0];
    // Remove time from dates
    json[0].taxExpiryDate = json[0].taxExpiryDate.split(" ")[0];
    json[0].noticePlacedDate = json[0].noticePlacedDate.split(" ")[0];
    json[0].secondInspectionDate = json[0].secondInspectionDate.split('#')[1].split(' ')[0]; // slightly differen to other dates because calculated column
    
    // optional dates
    if( json[0].removalRequestedDate ) json[0].removalRequestedDate = json[0].removalRequestedDate.split(" ")[0];
    if( json[0].vehicleRemovedDate ) json[0].vehicleRemovedDate = json[0].vehicleRemovedDate.split(" ")[0];

    // fix date format
    var date = json[0].taxExpiryDate.split("-");
    json[0].taxExpiryDate = date[2]+"-"+date[1]+"-"+date[0];

    date = json[0].noticePlacedDate.split("-");
    json[0].noticePlacedDate = date[2]+"-"+date[1]+"-"+date[0];
    
    date = json[0].secondInspectionDate.split("-");
    json[0].secondInspectionDate = date[2]+"-"+date[1]+"-"+date[0];
    
    // add psace ot vrn if not unknown
    if( json[0].vrn && json[0].vrn !== "Unknown" ) json[0].vrn = json[0].vrn.slice(0, 4) +" "+ json[0].vrn.slice(4);

    // populate notice
    switch(json[0].status){
        case "First Inspection Completed": 
            $('#notice').addClass("alert-warning").append('<strong>Estate Services to re-inspected vehicle on or shortly after <span class="secondInspectionDate"></span></strong>');
            break;
        case "Second Inspection Completed": 
            $('#notice').addClass("alert-info").append('<strong>Estate Parking to request removal of vehicle</strong>');
            break;
        case "Vehicle Removal Requested": 
            $('#notice').addClass("alert-info").append('<strong>Estate Parking requested removal on ' +json[0].removalRequestedDate+ '</strong>');
            break;       
        case "Vehicle Removed": 
            $('#notice').addClass("alert-success").append('<strong>Wing Parking removed this vehicle on ' +json[0].vehicleRemovedDate+ '</strong>');
            break;  
        case "Vehicle Gone Before Removal": 
            $('#notice').addClass("alert-default").append('<strong>This vehicle was gone before removal</strong>');
            break;  
    }
    
    // Populate DOM
    for(var prop in json[0]){
        console.log(prop+": "+json[0][prop]);
        // select dom element using column property of the same name
        $('#'+prop).text( json[0][prop] );
        $('.'+prop).text( json[0][prop] );
    }
    
    // Attachments
    getAttachmentFiles(listName, itemId, printAttachments);
    
    function printAttachments(urls){
        
        for(var i =0; i< urls.length; i++){
            filename = urls[i].split('/').pop();
            $('#attachments').append("<a href='"+urls[i]+"' target='_new'>"+filename+"</a><br>");

//            // populate carousel
//            $('.carousel-inner').append(
//                    '<div class="item">'
//                      +'<a href="'+urls[i]+'" target="_new">'
//                        +'<img src="'+urls[i]+'" alt="Slide '+i+'">'
//                        +'<div class="carousel-caption">'
//                          +i+'. '+filename
//                        +'</div>'
//                        +'</a>'
//                    +'</div>' 
//            );
//
//            $('.carousel-indicators').append(
//                '<li data-target="#carousel-example-generic" data-slide-to="'+i+'"></li>'
//            );
//            if(i===0) {
//                $('.carousel-indicators > li, .carousel-inner .item').addClass('active');
//            }
        };    
        

        // &#92; = backslash ('\').  In some cases escaping ('/\' doesn't work, so we use the ascii code.
        $('#attachments').append( ' <br><p><a class="btn btn-default btn-sm" style="margin-left: 0px !important" href="file:///&#92;&#92;izzi&#92;DavWWWRoot&#92;teams/\council/\hass/\operations/\hassep/\AbandonedVehicles/\Development/\Lists/\abandonedVehicleReports/\Attachments&#92;'+reportId+'"><i class="fa fa-folder-open"></i> &nbsp; Open attachments folder</a></p> ' );

        // display form wrapper
        $('#sections').fadeIn(100);
    }
    

}

function viewReportEvents(){
    $('#openSlideshow').click( function(){
        $('#attachments').parent().fadeOut(100, function(){
            $('#slideshow').parent().fadeIn(100);
        });
    } );
    
    $('#closeSlideshow').click( function(){
        $('#slideshow').parent().fadeOut(100, function(){
            $('#attachments').parent().fadeIn(100);
        });
    } );
}

function getAttachmentFiles(listName,listItemId,complete) {
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
    
    // show or hide vehicle type Other text input
    $('input[name="vehicleType"]').change( function(){
        var selected = $('input[name="vehicleType"]:radio:checked').val();
        if(selected==="Other"){ 
            $('#vehicleTypeOther').slideDown(100).attr('required','required');
            
        } else {
            $('#vehicleTypeOther').slideUp(100).removeAttr('required');
        };
    });
    
    // show / hide report type hints
    $('input[name="reportType"]').change( function(){
        // get index of selected radio button
        var selected = $('input[name="reportType"]').index(this);
        // hide all hints
        $('#reportType #hints span').hide();
        // select and show hint using radio button index 
        $('#reportType #hints span').eq(selected).show();
    });
    
    // when user adds file/s get them and store in array => an array of file objects
    $('input[type="file"]').change( function(){
        
        var files = $(this)[0].files;
        
        // check there are files before handling them
        if( files.length > 0 ){
            for(var i=0; i<files.length; i++){
                // add file to global attachments
                attachments.push(files[i]);

                // add filename to list of attachments
                $('#filesCached ol').append('<li>'+files[i].name+'<br></li>');

                // show list of attachments
                $('#filesCached').show();
            }        
        }
    });
    
    // when user clicks submit, check form data and send to SP list
    $('form').submit( function(itemId){
        
        // populate loader text
        $('.loader-text').text('Sending data');

        $('#formWrapper').fadeOut(100);

        $('.loader-container').fadeIn(100);
        
        // get form data and join to global SP fields list array
        readFormData();
        
        // prevent page refresh
        return false; 
    });
}

function prepNewForm(){
    
    // Prep elements in new or edit form   
    for(var i in estateParkingTeam){
        if(user === estateParkingTeam[i]){
            // show items only for use by estate parking team
            $('.btn').show();
            $('.form-group').show();
        }
    }
    
    // Disable autocomplete
    $('input[type="text"]').attr('autocomplete','off');
    
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
            
            var input = document.getElementById("estate");
            new Awesomplete(input, {
                list: list
            });
        }
    });
    
    $.ajax({
        url: "http://giswmsint:8080/geoserver/Oracle.Spatial/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=Oracle.Spatial:Estate-Blocks&outputFormat=text%2Fjavascript&format_options=callback:blocks",
        jsonpCallback: "blocks",
        dataType: "jsonp",
        success: function(data){
            var list = [];
            for( var i in data.features ) {
                list.push( data.features[i].properties["BLOCK_NAME"] );
            }
            
            var input = document.getElementById("block");
            new Awesomplete(input, {
                list: list
            });
        }
    });
    
    new Awesomplete( document.getElementById("vehicleTypeOther"), {
                list: ['Boat', 'Wagen', 'Tank', 'Helicopter', 'Train', 'Spacecraft', 'Rickshaw']
            });

    // add date picker to all form controls with date class
    $('.date').datepicker({
        format: "dd/mm/yyyy",
        weekStart: 1,
        maxViewMode: 1,
        todayBtn: "linked",
        autoclose: true,
        todayHighlight: true
    });
    
    // add date picker to all form controls with date class
    $('.businessDate').datepicker({
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

function readFormData(formType){ 
    
    var taxExpiryDate = convertDateFormat(  $('#taxExpiryDate').val() );
    var noticePlacedDate =  convertDateFormat(  $('#noticePlacedDate').val() );

    var vehicleType = ( $('#vehicleType input:radio:checked').val() === "Other" ) ? 
                        $('#vehicleTypeOther').val() : $('#vehicleType input:radio:checked').val();
        
    var dataFields = [
        // Report Type
        ["status",              $('#status input:radio:checked').val() ],
        ["reportType",          $('#reportType input:radio:checked').val() ],
        
        // Location
        ["housingArea",         $('#housingArea input:radio:checked').val() ],
        ["estate",              $('#estate').val() ],
        ["block",               $('#block').val() ] ,
        ["otherLocation",       $('#otherLocation').val() ], // NEW
        ["access",              $('#access').val() ],

        // Vehicle and Notice
        ["vrn",                 $('#vrn').val().toUpperCase().replace(/\s/g, '') ],
        ["vehicleType",         vehicleType ],
        ["vehicleMake",         $('#vehicleMake').val() ],
        ["vehicleModel",        $('#vehicleModel').val() ],
        ["vehicleColor",        $('#vehicleColor').val() ],
        ["vehicleCondition",    $('#vehicleCondition').val() ],
        ["taxExpiryDate",       taxExpiryDate ],
        ["noticePlacedDate",    noticePlacedDate ],

        // Owner Details
        ["ownerName",    $('#ownerName').val() ],
        ["ownerAddress", $('#ownerAddress').val() ]
    ];
    
    // add optionals to data fields
    var removalRequestedDate = $('#removalRequestedDate').val();
    if( removalRequestedDate.length > 0 ){
        removalRequestedDate = convertDateFormat(removalRequestedDate);
        dataFields.push(["removalRequestedDate", removalRequestedDate]);
    }

    var vehicleRemovedDate = $('#vehicleRemovedDate').val();
    if( vehicleRemovedDate.length > 0 ){
        vehicleRemovedDate = convertDateFormat(vehicleRemovedDate);
        dataFields.push(["vehicleRemovedDate", vehicleRemovedDate]);
    }
    
    for( var i=0; i<dataFields.length; i++){
        if( dataFields[i][1].length < 1 ){
            dataFields[i][1] = "Unknown";
        }
    }
    
    sendToSP(dataFields);

//        ["numOfDaysRemoval", "20"]            // REMOVED WITHIN 24HRS?  FOR ESTATE PARKING

}

function sendToSP(dataFields){

    // if global reportId has value then we should update the item, else we create new item
    if( reportId ){
        $().SPServices({
            operation: "UpdateListItems",
            async: true,
            batchCmd: "Update",
            listName: listName,
            ID: reportId,
            valuepairs: dataFields,
            completefunc: function(xData, Status) {
                console.log(xData.responseXML);
                $('.loader-text').append(' <span class="glyphicon glyphicon-ok"></span><br>Uploading attachments (<span class="attCnt"></span>)');
                // get item id
                var itemId = $(xData.responseXML).SPFilterNode("z:row").attr("ows_ID");
                var files;
                // upload attachments to item id
                if(attachments.length > 0){
                    postAttachments(listName,itemId,attachments);
                } else {
                    $('.loader-text').append(' <span class="glyphicon glyphicon-ok"></span>');
                    $('.loader-container').fadeOut(200, function(){
                        window.location = "index.html?id="+itemId;
                    });                
                }
            }
        });
    } else {
        // Validation - check there are at least 4 attachments for new reports before proceeding
        if( attachments.length >= 4 ){
            $().SPServices({
                operation: "UpdateListItems",
                async: true,
                batchCmd: "New",
                listName: listName,
                valuepairs: dataFields,
                completefunc: function(xData, Status) {
                    console.log(xData.responseXML);
                    $('.loader-text').append(' <span class="glyphicon glyphicon-ok"></span><br>Uploading attachments (<span class="attCnt"></span>)');
                    // get item id
                    var itemId = $(xData.responseXML).SPFilterNode("z:row").attr("ows_ID");
                    var files;
                    // upload attachments to item id
                    postAttachments(listName,itemId,attachments);
                }
            });
        } else {
            $('#formWrapper').fadeIn(100);
            $('.loader-container').fadeOut(100);
            alert("Please upload at least 4 images of the vehicle");
        }
    }
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
                // update loading screen
                $('.attCnt').text(i+" / "+files.length);
                if( i < files.length ){
                    postAttachments(listName, itemId, files);
                } else {
                    $('.loader-text').append(' <span class="glyphicon glyphicon-ok"></span>');
                    $('.loader-container').fadeOut(200, function(){
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

function convertDateFormat(date) {
// converting date from human format dd/mm/yyyy to toISOString format yyyy-mm-dd
    if(date.length>0){
        date = date.split('/');
        date = date[2]+"-"+date[1]+"-"+date[0];
        return new Date( date ).toISOString();
    } else {
        return "";
    }
}