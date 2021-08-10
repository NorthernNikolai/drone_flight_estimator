export class DronePresets {
    constructor() {
        this.presetSensors = [
            {
                key: 'p4_rtk',
                title: 'DJI Phantom 4 RTK',
                focalLength: 8.8,
                pixelPitch: 2.41,
                resolution_x: 5472,
                resolution_y: 3648
            },
            {
                key: 'p3p',
                title: 'DJI Phantom 3 Professional',
                focalLength: 3.61,
                pixelPitch: 1.56,
                resolution_x: 4000,
                resolution_y: 3000
            }
        ];
        this.presetFlightSpecs = {
                altitude: 45,
                speed: 10
        };
        this.presetSurveySpecs = {
            overlap_along: 70,
            overlap_across: 50
        };
    };
}
