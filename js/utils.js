import { generateLines } from './line_calculation.js'
import { geojson_survey_area } from './main.js'


export function geodesic_area_beautify ( area ) {
	if ( area ) {
		switch ( true ) {
			case ( area < 10000 ):
				return area.toFixed(1).toString() + ' m2';
			default:
				return (area * 0.000001).toFixed(3).toString() + ' km2';
		}
	} else {
		return '--'
	}
};


export function export_geojson_survey_area(sa) {
	saveAs( sa, 'survey_area.geojson' );
};

export const zeroPad = ( num, places ) => String( num ).padStart( places, '0' );

export function generate_geojson_from_polygon( area_latlngs ) {
	let geojson_feature = {};
	geojson_feature['type'] = 'Feature';
	geojson_feature['properties'] = {};
	geojson_feature['geometry'] = {};
	geojson_feature['geometry']['type'] = "Polygon";
	let coordinates = [];
	for ( let i = 0; i < area_latlngs[0].length; i++ ) {
		coordinates.push( [area_latlngs[0][i]['lng'], area_latlngs[0][i]['lat']] )
	}
	coordinates.push( [area_latlngs[0][0]['lng'], area_latlngs[0][0]['lat']] )
	geojson_feature['geometry']['coordinates'] = [coordinates];
	geojson_feature = turf.cleanCoords(geojson_feature);
	
	let geojson = {};
	geojson['type'] = "FeatureCollection";
	geojson['features'] = [];
	geojson['features'].push( geojson_feature );
	
	let geojson_blob = new Blob( [JSON.stringify( geojson )], {type: "text/plain;charset=utf-8"} )
	return [geojson_blob, geojson];
};


export function populate_vertex_table( area_latlngs ) {
	const table_vertex_body = document.getElementById( "table-vertex-body" );
	while (table_vertex_body.hasChildNodes()) {
		table_vertex_body.removeChild(table_vertex_body.lastChild);
	}
	
	if ( area_latlngs ) {
		var count = 1;
		area_latlngs[0].forEach( function( item ) {
			let row = table_vertex_body.insertRow();
			let number = row.insertCell( 0 );
			number.innerHTML = count;
			let lat = row.insertCell( 1 );
			lat.innerHTML = item['lat'].toFixed( 6 );
			let lng = row.insertCell( 2 );
			lng.innerHTML = item['lng'].toFixed( 6 );
			count += 1;
		});
	}
};


export function calculate_survey_area_buffer(sa) {
	var survey_area_buffer_style = {
		interactive: false,
		color: 'red',
		weight: 1,
		opacity: 0.8,
		fill: false,
		dashArray: '3'
	};
	
	var geojson_survey_area_buffered = turf.buffer(sa, 25, {units: 'meters'});
	var survey_area_buffer = L.geoJSON(geojson_survey_area_buffered, {
		style: survey_area_buffer_style
	});
	return survey_area_buffer
};


export function populate_preset_survey_specs( preset ) {
	const survey_overlap_along = document.getElementById( "survey_overlap_along" );
	const survey_overlap_across = document.getElementById( "survey_overlap_across" );
	
	survey_overlap_along.value = preset.presetSurveySpecs.overlap_along;
	survey_overlap_across.value = preset.presetSurveySpecs.overlap_across;
};


export function populate_preset_flight_specs( preset ) {
	const survey_flight_altitude = document.getElementById( "survey_flight_altitude" );
	const survey_flight_speed = document.getElementById( "survey_flight_speed" );
	
	survey_flight_altitude.value = preset.presetFlightSpecs.altitude;
	survey_flight_speed.value = preset.presetFlightSpecs.speed;
};


export function populate_sensor_preset_list(sensorPresets) {
	const presetDropdown = document.getElementById("survey_sensor_preset");
	sensorPresets.presetSensors.forEach(element => {
    	let opt = document.createElement("option");
		opt.value = element.key;
		opt.textContent = element.title;
		presetDropdown.appendChild(opt);
	});
};

export function populate_preset_sensor_form( preset ) {
	const survey_sensor_preset = document.getElementById( "survey_sensor_preset" );
	const sensor_form_focal_length = document.getElementById( "survey_sensor_focal_length" );
	const survey_sensor_pixel_pitch = document.getElementById( "survey_sensor_pixel_pitch" );
	const survey_sensor_resolution_x = document.getElementById( "survey_sensor_resolution_x" );
	const survey_sensor_resolution_y = document.getElementById( "survey_sensor_resolution_y" );
	const survey_opening_angle_x = document.getElementById( "survey_opening_angle_x" );
	const survey_opening_angle_y = document.getElementById( "survey_opening_angle_y" );
	const survey_gsd = document.getElementById( "survey_gsd" );
	const survey_footprint_x = document.getElementById( "survey_footprint_x" );
	const survey_footprint_y = document.getElementById( "survey_footprint_y" );

	let gsd = ( preset.presetSensors[0].pixelPitch / 1000 * preset.presetSensors[0].resolution_x * preset.presetFlightSpecs.altitude * 100 ) / ( preset.presetSensors[0].focalLength * preset.presetSensors[0].resolution_x )
	
	survey_sensor_preset.value = preset.presetSensors[0].key;
	sensor_form_focal_length.value = preset.presetSensors[0].focalLength;
	survey_sensor_pixel_pitch.value = preset.presetSensors[0].pixelPitch;
	survey_sensor_resolution_x.value = preset.presetSensors[0].resolution_x;
	survey_sensor_resolution_y.value = preset.presetSensors[0].resolution_y;
	survey_opening_angle_x.value = String(Math.round(2*((180/Math.PI)*(Math.atan(.5*preset.presetSensors[0].resolution_x*preset.presetSensors[0].pixelPitch/1000/preset.presetSensors[0].focalLength)))*100)/100) + ' deg';
	survey_opening_angle_y.value = String(Math.round(2*((180/Math.PI)*(Math.atan(.5*preset.presetSensors[0].resolution_y*preset.presetSensors[0].pixelPitch/1000/preset.presetSensors[0].focalLength)))*100)/100) + ' deg';
	survey_gsd.value = Math.round( gsd * 100 ) / 100;
	survey_footprint_x.value = Math.round( ( gsd * preset.presetSensors[0].resolution_x ) / 100 * 100 ) / 100;
	survey_footprint_y.value = Math.round( ( gsd * preset.presetSensors[0].resolution_y ) / 100 * 100 ) / 100;
};


export function re_populate_preset_sensor_form( preset_element ) {
	const survey_flight_altitude = document.getElementById( "survey_flight_altitude" );
	const sensor_form_focal_length = document.getElementById( "survey_sensor_focal_length" );
	const survey_sensor_pixel_pitch = document.getElementById( "survey_sensor_pixel_pitch" );
	const survey_sensor_resolution_x = document.getElementById( "survey_sensor_resolution_x" );
	const survey_sensor_resolution_y = document.getElementById( "survey_sensor_resolution_y" );
	const survey_opening_angle_x = document.getElementById( "survey_opening_angle_x" );
	const survey_opening_angle_y = document.getElementById( "survey_opening_angle_y" );
	const survey_gsd = document.getElementById( "survey_gsd" );
	const survey_footprint_x = document.getElementById( "survey_footprint_x" );
	const survey_footprint_y = document.getElementById( "survey_footprint_y" );

	let gsd = ( preset_element.pixelPitch / 1000 * preset_element.resolution_x * survey_flight_altitude.value * 100 ) / ( preset_element.focalLength * preset_element.resolution_x )
	
	sensor_form_focal_length.value = preset_element.focalLength;
	survey_sensor_pixel_pitch.value = preset_element.pixelPitch;
	survey_sensor_resolution_x.value = preset_element.resolution_x;
	survey_sensor_resolution_y.value = preset_element.resolution_y;
	survey_opening_angle_x.value = String(Math.round(2*((180/Math.PI)*(Math.atan(.5*preset_element.resolution_x*preset_element.pixelPitch/1000/preset_element.focalLength)))*100)/100) + ' deg';
	survey_opening_angle_y.value = String(Math.round(2*((180/Math.PI)*(Math.atan(.5*preset_element.resolution_y*preset_element.pixelPitch/1000/preset_element.focalLength)))*100)/100) + ' deg';
	survey_gsd.value = Math.round( gsd * 100 ) / 100;
	survey_footprint_x.value = Math.round( ( gsd * preset_element.resolution_x ) / 100 * 100 ) / 100;
	survey_footprint_y.value = Math.round( ( gsd * preset_element.resolution_y ) / 100 * 100 ) / 100;
};


export function register_all_fields_change_listener() {
	const survey_sensor_preset = document.getElementById( "survey_sensor_preset" );
	const survey_overlap_along = document.getElementById( "survey_overlap_along" );
	const survey_overlap_across = document.getElementById( "survey_overlap_across" );
	const survey_flight_altitude = document.getElementById( "survey_flight_altitude" );
	const survey_flight_speed = document.getElementById( "survey_flight_speed" );
	const sensor_form_focal_length = document.getElementById( "survey_sensor_focal_length" );
	const survey_sensor_pixel_pitch = document.getElementById( "survey_sensor_pixel_pitch" );
	const survey_sensor_resolution_x = document.getElementById( "survey_sensor_resolution_x" );
	const survey_sensor_resolution_y = document.getElementById( "survey_sensor_resolution_y" );

	survey_sensor_preset.addEventListener('change', (e) => {
		notify_form_field_changed();
	});
	survey_overlap_along.addEventListener('change', (e) => {
		notify_form_field_changed();
	});
	survey_overlap_across.addEventListener('change', (e) => {
		notify_form_field_changed();
	});
	survey_flight_altitude.addEventListener('change', (e) => {
		notify_form_field_changed();
	});
	survey_flight_speed.addEventListener('change', (e) => {
		notify_form_field_changed();
	});
	sensor_form_focal_length.addEventListener('change', (e) => {
		notify_form_field_changed();
	});
	survey_sensor_pixel_pitch.addEventListener('change', (e) => {
		notify_form_field_changed();
	});
	survey_sensor_resolution_x.addEventListener('change', (e) => {
		notify_form_field_changed();
	});
	survey_sensor_resolution_y.addEventListener('change', (e) => {
		notify_form_field_changed();
	});
};


export function read_all_fields() {
	const survey_sensor_preset = document.getElementById( "survey_sensor_preset" );
	const survey_overlap_along = document.getElementById( "survey_overlap_along" );
	const survey_overlap_across = document.getElementById( "survey_overlap_across" );
	const survey_flight_altitude = document.getElementById( "survey_flight_altitude" );
	const survey_flight_speed = document.getElementById( "survey_flight_speed" );
	const survey_sensor_focal_length = document.getElementById( "survey_sensor_focal_length" );
	const survey_sensor_pixel_pitch = document.getElementById( "survey_sensor_pixel_pitch" );
	const survey_sensor_resolution_x = document.getElementById( "survey_sensor_resolution_x" );
	const survey_sensor_resolution_y = document.getElementById( "survey_sensor_resolution_y" );
	const survey_gsd = document.getElementById( "survey_gsd" );
	const survey_footprint_x = document.getElementById( "survey_footprint_x" );
	const survey_footprint_y = document.getElementById( "survey_footprint_y" );

	let form_values = {
		survey_sensor_preset: survey_sensor_preset.value,
		survey_overlap_along: survey_overlap_along.value,
		survey_overlap_across: survey_overlap_across.value,
		survey_flight_altitude: survey_flight_altitude.value,
		survey_flight_speed: survey_flight_speed.value,
		survey_sensor_focal_length: survey_sensor_focal_length.value,
		survey_sensor_pixel_pitch: survey_sensor_pixel_pitch.value,
		survey_sensor_resolution_x: survey_sensor_resolution_x.value,
		survey_sensor_resolution_y: survey_sensor_resolution_y.value,
		survey_gsd: survey_gsd.value,
		survey_footprint_x: survey_footprint_x.value,
		survey_footprint_y: survey_footprint_y.value
	}

	return form_values;
}

function notify_form_field_changed() {
	let form_values = read_all_fields();
	const survey_opening_angle_x = document.getElementById( "survey_opening_angle_x" );
	const survey_opening_angle_y = document.getElementById( "survey_opening_angle_y" );
	const survey_gsd = document.getElementById( "survey_gsd" );
	const survey_footprint_x = document.getElementById( "survey_footprint_x" );
	const survey_footprint_y = document.getElementById( "survey_footprint_y" );

	let gsd = ( form_values.survey_sensor_pixel_pitch / 1000 * form_values.survey_sensor_resolution_x * form_values.survey_flight_altitude * 100 ) / ( form_values.survey_sensor_focal_length * form_values.survey_sensor_resolution_x )

	survey_opening_angle_x.value = String(Math.round(2*((180/Math.PI)*(Math.atan(.5*form_values.survey_sensor_resolution_x*form_values.survey_sensor_pixel_pitch/1000/form_values.survey_sensor_focal_length)))*100)/100) + ' deg';
	survey_opening_angle_y.value = String(Math.round(2*((180/Math.PI)*(Math.atan(.5*form_values.survey_sensor_resolution_y*form_values.survey_sensor_pixel_pitch/1000/form_values.survey_sensor_focal_length)))*100)/100) + ' deg';
	survey_gsd.value = Math.round( gsd * 100 ) / 100;
	survey_footprint_x.value = Math.round( ( gsd * form_values.survey_sensor_resolution_x ) / 100 * 100 ) / 100;
	survey_footprint_y.value = Math.round( ( gsd * form_values.survey_sensor_resolution_y ) / 100 * 100 ) / 100;
	
	console.log( 'Reset line, Points, etc. Parameter Changed!' );
};


export function init_generate_lines_button() {
	L.Control.ControlGenerateLines = L.Control.extend({
		onAdd: function(map) {
			var controlGenerateLinesDiv = L.DomUtil.create('div', 'leaflet-control-generate-lines');
			L.DomEvent
				.addListener(controlGenerateLinesDiv, 'click', L.DomEvent.stopPropagation)
				.addListener(controlGenerateLinesDiv, 'click', L.DomEvent.preventDefault)
			.addListener(controlGenerateLinesDiv, 'click', function () { generateLines(geojson_survey_area); });
			
			var controlGenerateLinesInteriorDiv = L.DomUtil.create('div', 'leaflet-control-generate-lines-interior animation bounce', controlGenerateLinesDiv);
			controlGenerateLinesInteriorDiv.title = 'Generate Flight Plan';
			controlGenerateLinesInteriorDiv.textContent = "Generate Lines"
			return controlGenerateLinesDiv;
		},
	});
	L.control.controlGenerateLines = function(opts) {
		return new L.Control.ControlGenerateLines(opts);
	};
};


export function spinner_show(){
	document.getElementById("spinner-back").classList.add("show");
	document.getElementById("spinner-front").classList.add("show");
  }


export function spinner_hide(){
	document.getElementById("spinner-back").classList.remove("show");
	document.getElementById("spinner-front").classList.remove("show");
  }