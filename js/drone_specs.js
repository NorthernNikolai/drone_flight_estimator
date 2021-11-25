export class DronePresets {
    constructor() {
        this.presetSensors = [
            {
                key: 'p4_rtk',
                title: 'DJI Phantom 4 RTK',
                focalLength: 8.8,
                pixelPitch: 2.41,
                resolution_x: 5472,
                resolution_y: 3648,
                image_size: 30
            },
            {
                key: 'p3p',
                title: 'DJI Phantom 3 Professional',
                focalLength: 3.61,
                pixelPitch: 1.56,
                resolution_x: 4000,
                resolution_y: 3000,
                image_size: 18
            },
            {
                key: 'maia_wv2',
                title: 'MAIA WorldView-2',
                focalLength: 7.5,
                pixelPitch: 3.75,
                resolution_x: 1280,
                resolution_y: 960,
                image_size: 21.2
            },
            {
                key: 'ricoh_gr2',
                title: 'RICOH GR 2',
                focalLength: 18.3,
                pixelPitch: 4.8,
                resolution_x: 4928,
                resolution_y: 3264,
                image_size: 30.1
            },
            {
                key: 'sony_imx249',
                title: 'SONY IMX 249 (SeaCat)',
                focalLength: 8,
                pixelPitch: 5.86,
                resolution_x: 1920,
                resolution_y: 1200,
                image_size: 2
            }
        ];
        this.presetFlightSpecs = {
                altitude: 45,
                speed: 10
        };
        this.presetSurveySpecs = {
            overlap_along: 80,
            overlap_across: 60
        };
    };
}
