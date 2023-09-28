import { geodesic_area_beautify } from './utils.js'
import { export_geojson_survey_area } from './utils.js'
import { generate_geojson_from_polygon } from './utils.js'
import { populate_vertex_table } from './utils.js'
import { calculate_survey_area_buffer } from './utils.js'
import { populate_preset_survey_specs } from './utils.js'
import { populate_preset_flight_specs } from './utils.js'
import { populate_sensor_preset_list } from './utils.js'
import { populate_preset_sensor_form } from './utils.js'
import { re_populate_preset_sensor_form } from './utils.js'
import { register_all_fields_change_listener } from './utils.js'
import { init_generate_lines_button } from './utils.js'
import { generateLines } from './line_calculation.js'
import { DronePresets } from './drone_specs.js'

let geojson_blob_survey_area = new Blob( [""], {type: "text/plain;charset=utf-8"} )
export var geojson_survey_area = [];
var geojson_survey_area_buffered = [];
var survey_area_buffer;


export const map = L.map( 'map', {
    minZoom: 0,
    maxZoom: 23,
	preferCanvas: true,
}).setView( [51.505, -0.09], 18 );

L.tileLayer( 'https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
	attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
	maxNativeZoom: 19,
	maxZoom: 22} ).addTo( map );

var survey_areas = new L.FeatureGroup();
map.addLayer( survey_areas );


// Initialize Leaflet Draw
self.drawControlFull = new L.Control.Draw({
	draw: {
		polyline: false,
		polygon: {
			shapeOptions: {
				color: '#011E41'
			}
		},
		circle: false,
		rectangle: {
			shapeOptions: {
				color: '#011E41'
			}
		},
		marker: false
	},
});

self.drawControlEdit = new L.Control.Draw({
  edit: {
	featureGroup: survey_areas,
	edit: true
  },
  draw: false
});
map.addControl( drawControlFull );


// On Draw Created
map.on('draw:created', function( e ) {
	var type = e.layerType;
	var layer = e.layer;
	
	if ( type === 'polygon' || type === 'rectangle' ) {
		var latlngs = layer.getLatLngs();
		[ geojson_blob_survey_area, geojson_survey_area ] = generate_geojson_from_polygon( latlngs );
	
		var export_geojson_survey_area_button = document.getElementById( 'export-geojson-survey-area' );
		export_geojson_survey_area_button.disabled = false;
		export_geojson_survey_area_button.addEventListener(
			'click', 
			function() {
				export_geojson_survey_area( geojson_blob_survey_area )
			}, 
		);
		
		survey_area_buffer = calculate_survey_area_buffer( geojson_survey_area );
		survey_area_buffer.addTo(map);

		self.drawControlFull.remove();
		self.drawControlEdit.addTo( map );
		
		survey_areas.addLayer( layer );
		document.getElementById( 'cell-survey-area' ).innerHTML = geodesic_area_beautify( L.GeometryUtil.geodesicArea( latlngs[0] ) );
		populate_vertex_table( latlngs );
		showGenerateLinesButton();
	}
});


// On Draw Edited
map.on('draw:edited', function ( e ) {
	var layers = e.layers;
	
	layers.eachLayer(function ( layer ) {
		var latlngs = layer.getLatLngs();
		geojson_blob_survey_area, geojson_survey_area = generate_geojson_from_polygon( latlngs );
		
		survey_area_buffer.removeFrom(map);
		survey_area_buffer = calculate_survey_area_buffer( geojson_survey_area );
		survey_area_buffer.addTo(map);

		
		document.getElementById( 'cell-survey-area' ).innerHTML = geodesic_area_beautify( L.GeometryUtil.geodesicArea( latlngs[0] ) );
		populate_vertex_table( latlngs );
	});
});


// On Draw Deleted
map.on('draw:deleted', function ( e ) {
	self.drawControlEdit.remove();
	self.drawControlFull.addTo( map );
	geojson_blob_survey_area = new Blob( [""], {type: "text/plain;charset=utf-8"} )
	geojson_survey_area = [];
	
	var export_geojson_survey_area_button = document.getElementById( 'export-geojson-survey-area' );
		export_geojson_survey_area_button.disabled = true;
		export_geojson_survey_area_button.removeEventListener( "click", export_geojson_survey_area );
	
	document.getElementById( 'cell-survey-area' ).innerHTML = '--';
	populate_vertex_table( null );
});


function showGenerateLinesButton() {
    L.control.controlGenerateLines({ position: 'topright' }).addTo(map);
}


// Initialize application
document.addEventListener("DOMContentLoaded", function() {
	const dronePresets = new DronePresets();
	populate_preset_survey_specs( dronePresets );
	populate_preset_flight_specs( dronePresets );
	populate_sensor_preset_list( dronePresets );
	populate_preset_sensor_form( dronePresets );

	const survey_sensor_preset = document.getElementById('survey_sensor_preset');
	survey_sensor_preset.addEventListener('change', (e) => {
		dronePresets.presetSensors.forEach(element => {
			if ( element.key == e.target.value ) {
				re_populate_preset_sensor_form( element );
			}
		});
	});

	// Event listener on all form fields
	register_all_fields_change_listener();

	// Initiate Custom Map Tools
	init_generate_lines_button();

	let export_geojson_survey_area_button = document.getElementById( 'export-geojson-survey-area' );
	export_geojson_survey_area_button.disabled = true;
  });
