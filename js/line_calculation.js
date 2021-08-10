import { spinner_show } from "./utils.js";
import { spinner_hide } from "./utils.js";
import { calculate_survey_area_buffer } from './utils.js'
import { map } from './main.js'
import { zeroPad } from "./utils.js";
import { read_all_fields } from './utils.js'


export function generateLines (sa) {
    spinner_show();
    let general_direction = quick_line_angle(sa);
    let rotated_bbox_ply = safe_bbox_polygon(sa, general_direction);
    let line_spacing = calculate_line_spacing(read_all_fields());
    let initial_survey_lines = line_generator(rotated_bbox_ply, line_spacing);
    let clipped_survey_lines = line_clip(initial_survey_lines, sa);
    L.geoJSON(clipped_survey_lines, {
        onEachFeature: function ( f, l ) {
            l.bindPopup(f.properties.survey_line_name);
        }
    }).addTo(map);
    spinner_hide();
}


function quick_line_angle(sa) {
    let sa_line_segments = turf.lineSegment(sa);
    let simple_line_direction = [
        [0,0,0],
        [0,0,0],
        [0,0,0],
        [0,0,0]
    ]

    sa_line_segments.features.forEach(element => {
        let point_01 = turf.point(element.geometry.coordinates[0]);
        let point_02 = turf.point(element.geometry.coordinates[1]);
        let line_segment_bearing = turf.rhumbBearing(point_01, point_02);
        if ( line_segment_bearing < 0 ) {
            line_segment_bearing += 180; 
        }
        console.log(line_segment_bearing);
        let line_segment_distance = turf.distance(point_01, point_02, {units: 'meters'})

        if ( ( line_segment_bearing >=  0 && line_segment_bearing < 45 ) || line_segment_bearing == 180 ) {
            simple_line_direction[0][0] += 1;
            simple_line_direction[0][1] += line_segment_distance;
            if ( line_segment_bearing == 180 ) {
                simple_line_direction[0][2] += 0;
            } else {
                simple_line_direction[0][2] += line_segment_bearing;
            }
        }
        else if ( line_segment_bearing >=  45 && line_segment_bearing < 90 ) {
            simple_line_direction[1][0] += 1;
            simple_line_direction[1][1] += line_segment_distance;
            simple_line_direction[1][2] += line_segment_bearing;
        }
        else if ( line_segment_bearing >=  90 && line_segment_bearing < 135 ) {
            simple_line_direction[2][0] += 1;
            simple_line_direction[2][1] += line_segment_distance;
            simple_line_direction[2][2] += line_segment_bearing;
        }
        else if ( line_segment_bearing >=  135 ) {
            simple_line_direction[3][0] += 1;
            simple_line_direction[3][1] += line_segment_distance;
            simple_line_direction[3][2] += line_segment_bearing;
        }
    });
    console.log(simple_line_direction);
    let simple_line_direction_map = simple_line_direction.map(element => (element[1]));
    let max_length_index = simple_line_direction_map.indexOf(Math.max.apply(null, simple_line_direction_map));
    let general_direction = simple_line_direction[max_length_index][2] / simple_line_direction[max_length_index][0];
    return general_direction
}

function safe_bbox_polygon(sa, general_direction) {
    let rotated_sa = turf.transformRotate(sa, 90)
    
    let sa_bbox = turf.bbox(turf.featureCollection([...sa.features, ...rotated_sa.features]));
    let sa_bbox_ply = turf.bboxPolygon(sa_bbox);
    let sa_bbox_segments = turf.lineSegment(sa_bbox_ply);
    let bbox_edge_length = turf.length(sa_bbox_segments.features[0], {units: 'meters'});
    sa_bbox = turf.bbox(turf.buffer(turf.featureCollection([...sa.features, ...rotated_sa.features]), bbox_edge_length/2, {units: 'meters'}));
    sa_bbox_ply = turf.bboxPolygon(sa_bbox);
    let rotated_bbox_ply = turf.transformRotate(sa_bbox_ply, general_direction)
    return rotated_bbox_ply
}

function calculate_line_spacing( form_values ) {
    let overlap_across = form_values.survey_overlap_across;
    let gsd = ( form_values.survey_sensor_pixel_pitch / 1000 * form_values.survey_sensor_resolution_x * form_values.survey_flight_altitude * 100 ) / ( form_values.survey_sensor_focal_length * form_values.survey_sensor_resolution_x );
    let footprint_x = ( gsd * form_values.survey_sensor_resolution_x ) / 100;
    let line_spacing = ( 100 - overlap_across ) / 100 * footprint_x;
    return line_spacing;
}

function line_generator(rotated_bbox_ply, line_spacing) {
    let rotated_bbox_segments = turf.lineSegment(rotated_bbox_ply);
    let build_line_start = rotated_bbox_segments.features[0];
    let build_line_end = turf.transformRotate(rotated_bbox_segments.features[2], 180);
    let line_length = turf.length(build_line_start, {units: 'meters'});
    let nr_of_lines = Math.floor( line_length / line_spacing );
    let line_start_point_list = [];
    let line_end_point_list = [];
    for( let i=0; i<nr_of_lines; i++ ) {
        line_start_point_list[i] = turf.along(build_line_start, line_spacing * i, {units: 'meters'});
        line_end_point_list[i] = turf.along(build_line_end, line_spacing * i, {units: 'meters'});
        line_start_point_list[i].properties.count = i;
        line_end_point_list[i].properties.count = nr_of_lines -1 - i;
    };

    let line_list = [];
    for( let j=0; j<nr_of_lines; j++ ) {
        line_list[j] = turf.lineString([line_start_point_list[j].geometry.coordinates, line_end_point_list[j].geometry.coordinates], {name: j});
    };
    return line_list
}

function line_clip(initial_survey_lines, sa) {
    let fgb = [];
    let bbPoly = turf.bboxPolygon(turf.bbox(sa));
    initial_survey_lines.forEach(element => {
        let bbLine = turf.bboxPolygon(turf.bbox(element));
        if ( turf.intersect(bbLine, bbPoly) ) {
            let slc = turf.lineSplit(element, sa.features[0]);
            for ( let i=0; i<slc.features.length; i++ ) {
                let curSlc = slc.features[i];
                let len = turf.length(curSlc, {units: 'meters'});
                let ptMiddle = turf.along(curSlc, len/2, {units: 'meters'});
                if ( turf.inside(ptMiddle, sa.features[0]) ) {
                    fgb.push(curSlc);
                }
            }
        }
    })
    let clipped_lines = turf.featureCollection(fgb);
    for ( let k=0; k<clipped_lines.features.length; k++ ) {
        clipped_lines.features[k].properties.survey_line = k;
        clipped_lines.features[k].properties.survey_line_name = 'survey_line_' + zeroPad (k, 4 );
        clipped_lines.features[k].properties.survey_line_length = turf.length(clipped_lines.features[k], {units: 'meters'});
    }

    return clipped_lines;
}