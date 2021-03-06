import { spinner_show } from "./utils.js";
import { spinner_hide } from "./utils.js";
import { calculate_survey_area_buffer } from './utils.js'
import { map } from './main.js'
import { zeroPad } from "./utils.js";
import { read_all_fields } from './utils.js'


export function generateLines (sa) {
    spinner_show();
    new Promise(
    (resolve,reject) => {
        setTimeout(()=> {
            let field_values = read_all_fields();
            let general_direction = quick_line_angle(sa);
            let rotated_bbox_ply = safe_bbox_polygon(sa, general_direction);
            let line_spacing = calculate_line_spacing(field_values);
            let initial_survey_lines = line_generator(rotated_bbox_ply, line_spacing);
            let clipped_survey_lines = line_clip(initial_survey_lines, sa, line_spacing);
            let transit_lines = calculate_transit_lines(clipped_survey_lines);
            let shot_spacing = calculate_shot_spacing(field_values);
            let shot_points = calculate_shot_points(clipped_survey_lines, shot_spacing);
            console.log(shot_points)
            L.geoJSON(clipped_survey_lines, {
                onEachFeature: function ( f, l ) {
                    l.bindPopup(f.properties.survey_line_name);
                }
            }).addTo(map);

            L.geoJSON(transit_lines, {
                onEachFeature: function ( f, l ) {
                    l.bindPopup(f.properties.transit_line_name);
                }
            }).addTo(map);

            L.geoJSON(shot_points, {
                onEachFeature: function ( f, l ) {
                    l.bindPopup(f.properties.shotpoint_name);
                }
            }).addTo(map);

            resolve();
        }, 1000);
    }).then(
        () => spinner_hide()
    );  
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
        if ( j % 2 == 0 ) {
            line_list[j] = turf.lineString([line_start_point_list[j].geometry.coordinates, line_end_point_list[j].geometry.coordinates], {survey_line: j});
        } else {
            line_list[j] = turf.lineString([line_end_point_list[j].geometry.coordinates, line_start_point_list[j].geometry.coordinates], {survey_line: j});
        }
    };
    return line_list
}

function line_clip(initial_survey_lines, sa_initial, line_spacing) {
    let sa = turf.buffer(sa_initial, line_spacing + 0.5, {units: 'meters'});
    let fgb = [];
    let bbPoly = turf.bboxPolygon(turf.bbox(sa));
    let used_survey_lines = [];
    initial_survey_lines.forEach(element => {
        let bbLine = turf.bboxPolygon(turf.bbox(element));
        if ( turf.intersect(bbLine, bbPoly) ) {
            let slc = turf.lineSplit(element, sa.features[0]);
            for ( let i=0; i<slc.features.length; i++ ) {
                let curSlc = slc.features[i];
                let len = turf.length(curSlc, {units: 'meters'});
                let ptMiddle = turf.along(curSlc, len/2, {units: 'meters'});
                if ( turf.inside(ptMiddle, sa.features[0]) ) {
                    curSlc.properties.survey_line = element.properties.survey_line;
                    used_survey_lines.push(element.properties.survey_line);
                    fgb.push(curSlc);
                }
            }
        }
    })
    let clipped_lines = turf.featureCollection(fgb);
    let min_survey_line = Math.min(...used_survey_lines);

    for ( let k=0; k<clipped_lines.features.length; k++ ) {
        let corrected_survey_line = clipped_lines.features[k].properties.survey_line - min_survey_line + 1;
        clipped_lines.features[k].properties.survey_line = corrected_survey_line;
        clipped_lines.features[k].properties.survey_line_name = 'survey_line_' + zeroPad (corrected_survey_line, 4 );
        clipped_lines.features[k].properties.survey_line_length = turf.length(clipped_lines.features[k], {units: 'meters'});
    }

    return clipped_lines;
}

function calculate_transit_lines(survey_lines) {
    let transit_lines = [];
    let transit_start;

    turf.featureEach(survey_lines, function ( currentLine, featureIndex ) {
        let transit_end = currentLine.geometry.coordinates[0];

        if ( featureIndex != 0 ) {
            transit_lines.push(turf.lineString([transit_start, transit_end], {transit_line: featureIndex, transit_line_name: 'transit_line_' + zeroPad (featureIndex, 4 )}));
            transit_start = [...currentLine.geometry.coordinates].pop();
        } else {
            transit_start = [...currentLine.geometry.coordinates].pop();
        }
    });

    let transit_lines_collection = turf.featureCollection(transit_lines);

    for ( let k=0; k<transit_lines_collection.features.length; k++ ) {
        transit_lines_collection.features[k].properties.transit_line_length = turf.length(transit_lines_collection.features[k], {units: 'meters'});
    }

    return transit_lines_collection;
}


function calculate_shot_spacing( field_values ) {
    let overlap_along = field_values.survey_overlap_along;
    let footprint_y = field_values.survey_footprint_y;
    let shot_spacing = ( 100 - overlap_along ) / 100 * footprint_y;

    return shot_spacing;
}

function calculate_shot_points( clipped_survey_lines, shot_spacing ) {
    let shot_point_counter = 0;
    let shot_point_list = [];
    turf.featureEach(clipped_survey_lines, function ( currentFeature, featureIndex ) {
        let line_length = turf.length(currentFeature, {units: 'meters'})
        let nr_of_shotpoints = Math.floor( line_length / shot_spacing );
        for ( let i=1; i<nr_of_shotpoints; i++ ) {
            let current_shot_point = turf.along(currentFeature, shot_spacing * i, {units: 'meters'});
            current_shot_point.properties.shotpoint = shot_point_counter;
            current_shot_point.properties.shotpoint_name = 'shotpoint_' + zeroPad(shot_point_counter, 6 );
            shot_point_list.push(current_shot_point);
            shot_point_counter++;
        }
    })
    let shotpoint_collection = turf.featureCollection(shot_point_list);
    return shotpoint_collection;
}