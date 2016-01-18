
// var loadingTemplate = '<center><i class="fa fa-3x fa-refresh fa-spin"></i></center>';
var loadingTemplate = '<center><div class="preloader-wrapper active"><div class="spinner-layer"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div></center>';

$(document).ajaxStart(function() {
    $('#main-content').html(loadingTemplate);
});

function getData(desc) {
	var start = $('input#from-date').val() ? moment($('input#from-date').val()).valueOf() : 0;
	var end = $('input#to-date').val() ? moment($('input#to-date').val()).valueOf() : Date.now();
	var context = $('input#context').val() ? $('input#context').val() : 'all';

	$.ajax({
		url: 'http://cdrapi-safetelecom.rhcloud.com/api/cdrs',
		data: {"start": start, "end": end, "context": context},
		method: 'GET',
		success: function(records) {

			var docs = records.docs;
			docs.sort(function(a, b) {
				if(desc) {
					return b.variables.start_uepoch - a.variables.start_uepoch;
				} else {
					return a.variables.start_uepoch - b.variables.start_uepoch;
				}
			});

			$('#main-content').html('<ul class="collection"></ul>');

			$.each(docs, function(key, value) {
				var icon = '';
				var name = '';
				var number = '';

				if(value.channel_data.direction == 'inbound') {
					icon = '<i class="medium material-icons circle green">call_received</i>';
					number = value.variables.sip_from_user;
					name = value.variables.caller_id_name;
				} else {
					icon = '<i class="medium material-icons circle red">call_made</i>';
					number = value.variables.sip_to_user;
					name = 'outbound';
				}

				$('ul.collection').append('<li class="collection-item avatar">' + icon + '<span class="title">' + moment.unix(value.variables.start_epoch).format('LLL') + '</span><p>Caller: ' + name + '<br>Number: ' + number + '<br><strong>Context: ' + value.callflow[0].caller_profile.context + '</strong></p><a href="#!" class="secondary-content">' + value.variables.billsec + ' sec</a></li>');
			});
		},
		error: function(jqXHR, textStatus, error) {
			$('#main-content').html(JSON.stringify(jqXHR));
		}
	});
};

$(document).ready(function() {
	var desc = true;

	$('#sort-button').click(function(e) {
		e.preventDefault();
		desc = desc ? false : true;
		getData(desc);

	});
	$('#refresh-button').click(function(e) {
		e.preventDefault();
		location.reload();
	});
	$('#go-date').click(function(e) {
		e.preventDefault();
		getData(desc);
		$('#date-modal').closeModal();
	});
	$('#go-context').click(function(e) {
		e.preventDefault();
		getData(desc);
		$('#context-modal').closeModal();
	});

    getData(desc);
});
