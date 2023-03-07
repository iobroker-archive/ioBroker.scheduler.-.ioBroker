/*!
 * ioBroker gulpfile
 * Date: 2023-02-22
 */
'use strict';

const gulp        = require('gulp');
const fs          = require('fs');
const cp          = require('child_process');
const adapterName = require('./package.json').name.replace('iobroker.', '');

function deleteFoldersRecursive(path, exceptions) {
    if (fs.existsSync(path)) {
        const files = fs.readdirSync(path);
        for (const file of files) {
            const curPath = `${path}/${file}`;
            if (exceptions && exceptions.find(e => curPath.endsWith(e))) {
                continue;
            }

            const stat = fs.statSync(curPath);
            if (stat.isDirectory()) {
                deleteFoldersRecursive(curPath);
                fs.rmdirSync(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        }
    }
}

function npmInstall(src) {
    return new Promise((resolve, reject) => {
        // Install node modules
        const cwd = `${__dirname.replace(/\\/g, '/')}/${src || 'src'}/`;

        const cmd = `npm install -f`;
        console.log(`"${cmd} in ${cwd}`);

        // System call used for update of js-controller itself,
        // because during installation npm packet will be deleted too, but some files must be loaded even during the install process.
        const child = cp.exec(cmd, {cwd});

        child.stderr.pipe(process.stderr);
        child.stdout.pipe(process.stdout);

        child.on('exit', (code /* , signal */) => {
            // code 1 is strange error that cannot be explained. Everything is installed but error :(
            if (code && code !== 1) {
                reject(`Cannot install: ${code}`);
            } else {
                console.log(`"${cmd} in ${cwd} finished.`);
                // command succeeded
                resolve();
            }
        });
    });
}

function sync2files(src, dst) {
    const srcTxt = fs.readFileSync(src).toString('utf8');
    const destTxt = fs.readFileSync(dst).toString('utf8');
    if (srcTxt !== destTxt) {
        const srcs = fs.statSync(src);
        const dest = fs.statSync(dst);
        if (srcs.mtime > dest.mtime) {
            fs.writeFileSync(dst, srcTxt);
        } else {
            fs.writeFileSync(src, destTxt);
        }
    }
}

function buildWidgets() {
    const version = JSON.parse(fs.readFileSync(`${__dirname}/package.json`).toString('utf8')).version;
    const data    = JSON.parse(fs.readFileSync(`${__dirname}/src-widgets/package.json`).toString('utf8'));

    data.version = version;

    fs.writeFileSync(`${__dirname}/src-widgets/package.json`, JSON.stringify(data, null, 4));

    // we have bug, that federation requires version number in @mui/material/styles, so we have to change it
    // read version of @mui/material and write it to @mui/material/styles
    const muiStyleVersion = JSON.parse(fs.readFileSync(`${__dirname}/src-widgets/node_modules/@mui/material/styles/package.json`).toString('utf8'));
    if (!muiStyleVersion.version) {
        const muiVersion = JSON.parse(fs.readFileSync(`${__dirname}/src-widgets/node_modules/@mui/material/package.json`).toString('utf8'));
        muiStyleVersion.version = muiVersion.version;
        fs.writeFileSync(`${__dirname}/src-widgets/node_modules/@mui/material/styles/package.json`, JSON.stringify(muiStyleVersion, null, 2));
    }

    // sync src and src-widgets
    sync2files(`${__dirname}/src-widgets/src/components/DayNightSwitcher.js`, `${__dirname}/src/src/components/DayNightSwitcher.js`);
    sync2files(`${__dirname}/src-widgets/src/components/DayOfWeekPanel.js`, `${__dirname}/src/src/components/DayOfWeekPanel.js`);
    sync2files(`${__dirname}/src-widgets/src/components/Interval.js`, `${__dirname}/src/src/components/Interval.js`);
    sync2files(`${__dirname}/src-widgets/src/components/Intervals.js`, `${__dirname}/src/src/components/Intervals.js`);
    sync2files(`${__dirname}/src-widgets/src/components/IntervalsContainer.js`, `${__dirname}/src/src/components/IntervalsContainer.js`);

    return new Promise((resolve, reject) => {
        const options = {
            stdio: 'pipe',
            cwd: `${__dirname}/src-widgets/`,
        };

        console.log(options.cwd);

        let script = `${__dirname}/src-widgets/node_modules/@craco/craco/dist/bin/craco.js`;
        if (!fs.existsSync(script)) {
            script = `${__dirname}/node_modules/@craco/craco/dist/bin/craco.js`;
        }
        if (!fs.existsSync(script)) {
            console.error(`Cannot find execution file: ${script}`);
            reject(`Cannot find execution file: ${script}`);
        } else {
            const child = cp.fork(script, ['build'], options);
            child.stdout.on('data', data => console.log(data.toString()));
            child.stderr.on('data', data => console.log(data.toString()));
            child.on('close', code => {
                console.log(`compile process exited with code ${code}`);
                code ? reject(`Exit code: ${code}`) : resolve();
            });
        }
    });
}

function build() {
    return new Promise((resolve, reject) => {
        const options = {
            stdio: 'pipe',
            cwd:   `${__dirname}/src/`
        };

        const version = JSON.parse(fs.readFileSync(`${__dirname}/package.json`).toString('utf8')).version;
        const data = JSON.parse(fs.readFileSync(`${__dirname}/src/package.json`).toString('utf8'));
        data.version = version;
        fs.writeFileSync(`${__dirname}/src/package.json`, JSON.stringify(data, null, 4));

        console.log(options.cwd);

        let script = `${__dirname}/src/node_modules/react-scripts/scripts/build.js`;
        if (!fs.existsSync(script)) {
            script = `${__dirname}/node_modules/react-scripts/scripts/build.js`;
        }
        if (!fs.existsSync(script)) {
            console.error(`Cannot find execution file: ${script}`);
            reject(`Cannot find execution file: ${script}`);
        } else {
            const child = cp.fork(script, [], options);
            child.stdout.on('data', data => console.log(data.toString()));
            child.stderr.on('data', data => console.log(data.toString()));
            child.on('close', code => {
                console.log(`child process exited with code ${code}`);
                code ? reject(`Exit code: ${code}`) : resolve();
            });
        }
    });
}

// TASKS
gulp.task('widget-0-clean', done => {
    deleteFoldersRecursive(`${__dirname}/src-widgets/build`);
    deleteFoldersRecursive(`${__dirname}/widgets`);
    done();
});

gulp.task('widget-1-npm', async () => npmInstall('src-widgets'));

gulp.task('widget-2-compile', async () => buildWidgets());

gulp.task('widget-3-copy', () => Promise.all([
    gulp.src([`src-widgets/build/*.js`]).pipe(gulp.dest(`widgets/${adapterName}`)),
    gulp.src([`src-widgets/build/img/*`]).pipe(gulp.dest(`widgets/${adapterName}/img`)),
    gulp.src([`src-widgets/build/*.map`]).pipe(gulp.dest(`widgets/${adapterName}`)),
    gulp.src([
        `src-widgets/build/static/**/*`,
        `!src-widgets/build/static/js/node_modules*.*`,
        `!src-widgets/build/static/js/vendors-node_modules*.*`,
        `!src-widgets/build/static/js/main*.*`,
        `!src-widgets/build/static/js/src_bootstrap*.*`,
        `!src-widgets/build/static/media/Alarm Systems.*.svg`,
        `!src-widgets/build/static/media/Amplifier.*.svg`,
        `!src-widgets/build/static/media/Anteroom.*.svg`,
        `!src-widgets/build/static/media/Attic.*.svg`,
        `!src-widgets/build/static/media/Awnings.*.svg`,
        `!src-widgets/build/static/media/Balcony.*.svg`,
        `!src-widgets/build/static/media/Barn.*.svg`,
        `!src-widgets/build/static/media/Basement.*.svg`,
        `!src-widgets/build/static/media/Bathroom.*.svg`,
        `!src-widgets/build/static/media/Battery Status.*.svg`,
        `!src-widgets/build/static/media/Bedroom.*.svg`,
        `!src-widgets/build/static/media/Boiler Room.*.svg`,
        `!src-widgets/build/static/media/Carport.*.svg`,
        `!src-widgets/build/static/media/Ceiling Spotlights.*.svg`,
        `!src-widgets/build/static/media/Cellar.*.svg`,
        `!src-widgets/build/static/media/Chamber.*.svg`,
        `!src-widgets/build/static/media/Chandelier.*.svg`,
        `!src-widgets/build/static/media/Climate.*.svg`,
        `!src-widgets/build/static/media/Coffee Makers.*.svg`,
        `!src-widgets/build/static/media/Cold Water.*.svg`,
        `!src-widgets/build/static/media/Computer.*.svg`,
        `!src-widgets/build/static/media/Consumption.*.svg`,
        `!src-widgets/build/static/media/Corridor.*.svg`,
        `!src-widgets/build/static/media/Curtains.*.svg`,
        `!src-widgets/build/static/media/Dining Area.*.svg`,
        `!src-widgets/build/static/media/Dining Room.*.svg`,
        `!src-widgets/build/static/media/Dining.*.svg`,
        `!src-widgets/build/static/media/Dishwashers.*.svg`,
        `!src-widgets/build/static/media/Doors.*.svg`,
        `!src-widgets/build/static/media/Doorstep.*.svg`,
        `!src-widgets/build/static/media/Dressing Room.*.svg`,
        `!src-widgets/build/static/media/Driveway.*.svg`,
        `!src-widgets/build/static/media/Dryer.*.svg`,
        `!src-widgets/build/static/media/Entrance.*.svg`,
        `!src-widgets/build/static/media/Equipment Room.*.svg`,
        `!src-widgets/build/static/media/Fan.*.svg`,
        `!src-widgets/build/static/media/Floor Lamps.*.svg`,
        `!src-widgets/build/static/media/Front Yard.*.svg`,
        `!src-widgets/build/static/media/Gallery.*.svg`,
        `!src-widgets/build/static/media/Garage Doors.*.svg`,
        `!src-widgets/build/static/media/Garage.*.svg`,
        `!src-widgets/build/static/media/Garden.*.svg`,
        `!src-widgets/build/static/media/Gates.*.svg`,
        `!src-widgets/build/static/media/Ground Floor.*.svg`,
        `!src-widgets/build/static/media/Guest Bathroom.*.svg`,
        `!src-widgets/build/static/media/Guest Room.*.svg`,
        `!src-widgets/build/static/media/Gym.*.svg`,
        `!src-widgets/build/static/media/Hairdryer.*.svg`,
        `!src-widgets/build/static/media/Hall.*.svg`,
        `!src-widgets/build/static/media/Handle.*.svg`,
        `!src-widgets/build/static/media/Hanging Lamps.*.svg`,
        `!src-widgets/build/static/media/Heater.*.svg`,
        `!src-widgets/build/static/media/Home Theater.*.svg`,
        `!src-widgets/build/static/media/Hoods.*.svg`,
        `!src-widgets/build/static/media/Hot Water.*.svg`,
        `!src-widgets/build/static/media/Humidity.*.svg`,
        `!src-widgets/build/static/media/Iron.*.svg`,
        `!src-widgets/build/static/media/Irrigation.*.svg`,
        `!src-widgets/build/static/media/Kitchen.*.svg`,
        `!src-widgets/build/static/media/Laundry Room.*.svg`,
        `!src-widgets/build/static/media/Led Strip.*.svg`,
        `!src-widgets/build/static/media/Light.*.svg`,
        `!src-widgets/build/static/media/Lightings.*.svg`,
        `!src-widgets/build/static/media/Living Area.*.svg`,
        `!src-widgets/build/static/media/Living Room.*.svg`,
        `!src-widgets/build/static/media/Lock.*.svg`,
        `!src-widgets/build/static/media/Locker Room.*.svg`,
        `!src-widgets/build/static/media/Louvre.*.svg`,
        `!src-widgets/build/static/media/Mowing Machine.*.svg`,
        `!src-widgets/build/static/media/Music.*.svg`,
        `!src-widgets/build/static/media/names.*.txt`,
        `!src-widgets/build/static/media/Nursery.*.svg`,
        `!src-widgets/build/static/media/Office.*.svg`,
        `!src-widgets/build/static/media/Outdoor Blinds.*.svg`,
        `!src-widgets/build/static/media/Outdoors.*.svg`,
        `!src-widgets/build/static/media/People.*.svg`,
        `!src-widgets/build/static/media/Playroom.*.svg`,
        `!src-widgets/build/static/media/Pool.*.svg`,
        `!src-widgets/build/static/media/Power Consumption.*.svg`,
        `!src-widgets/build/static/media/Printer.*.svg`,
        `!src-widgets/build/static/media/Pump.*.svg`,
        `!src-widgets/build/static/media/Rear Wall.*.svg`,
        `!src-widgets/build/static/media/Receiver.*.svg`,
        `!src-widgets/build/static/media/Sconces.*.svg`,
        `!src-widgets/build/static/media/Second Floor.*.svg`,
        `!src-widgets/build/static/media/Security.*.svg`,
        `!src-widgets/build/static/media/Shading.*.svg`,
        `!src-widgets/build/static/media/Shed.*.svg`,
        `!src-widgets/build/static/media/Shutters.*.svg`,
        `!src-widgets/build/static/media/Sleeping Area.*.svg`,
        `!src-widgets/build/static/media/SmokeDetector.*.svg`,
        `!src-widgets/build/static/media/Sockets.*.svg`,
        `!src-widgets/build/static/media/Speaker.*.svg`,
        `!src-widgets/build/static/media/Stairway.*.svg`,
        `!src-widgets/build/static/media/Stairwell.*.svg`,
        `!src-widgets/build/static/media/Storeroom.*.svg`,
        `!src-widgets/build/static/media/Stove.*.svg`,
        `!src-widgets/build/static/media/Summer House.*.svg`,
        `!src-widgets/build/static/media/Swimming Pool.*.svg`,
        `!src-widgets/build/static/media/Table Lamps.*.svg`,
        `!src-widgets/build/static/media/Temperature Sensors.*.svg`,
        `!src-widgets/build/static/media/Terrace.*.svg`,
        `!src-widgets/build/static/media/Toilet.*.svg`,
        `!src-widgets/build/static/media/Tv.*.svg`,
        `!src-widgets/build/static/media/Upstairs.*.svg`,
        `!src-widgets/build/static/media/Vacuum Cleaner.*.svg`,
        `!src-widgets/build/static/media/Ventilation.*.svg`,
        `!src-widgets/build/static/media/Wardrobe.*.svg`,
        `!src-widgets/build/static/media/Washing Machines.*.svg`,
        `!src-widgets/build/static/media/Washroom.*.svg`,
        `!src-widgets/build/static/media/Water Consumption.*.svg`,
        `!src-widgets/build/static/media/Water Heater.*.svg`,
        `!src-widgets/build/static/media/Water.*.svg`,
        `!src-widgets/build/static/media/Wc.*.svg`,
        `!src-widgets/build/static/media/Weather.*.svg`,
        `!src-widgets/build/static/media/Window.*.svg`,
        `!src-widgets/build/static/media/Windscreen.*.svg`,
        `!src-widgets/build/static/media/Workshop.*.svg`,
        `!src-widgets/build/static/media/Workspace.*.svg`,
    ]).pipe(gulp.dest(`widgets/${adapterName}/static`)),
    gulp.src([
        `src-widgets/build/static/js/vendors-node_modules_babel_runtime_helpers_asyncToGenerator*.*`,
        `src-widgets/build/static/js/node_modules_iobroker_vis-2-widgets-react-dev_index_jsx*.*`
    ]).pipe(gulp.dest(`widgets/${adapterName}/static/js`)),
    gulp.src([`src-widgets/src/i18n/*.json`]).pipe(gulp.dest(`widgets/${adapterName}/i18n`)),
    new Promise(resolve =>
        setTimeout(() => {
            if (fs.existsSync(`widgets/${adapterName}/static/media`) &&
                !fs.readdirSync(`widgets/${adapterName}/static/media`).length
            ) {
                fs.rmdirSync(`widgets/${adapterName}/static/media`);
            }
            resolve(null);
        }, 500)
    )
]));

gulp.task('widget-build', gulp.series(['widget-0-clean', 'widget-1-npm', 'widget-2-compile', 'widget-3-copy']));

gulp.task('clean', done => {
    deleteFoldersRecursive(`${__dirname}/admin`, ['scheduler.png'])
    done();
});

gulp.task('2-npm', () => {
    if (fs.existsSync(`${__dirname}/src/node_modules`)) {
        return Promise.resolve();
    } else {
        return npmInstall();
    }
});

gulp.task('2-npm-dep', gulp.series('clean', '2-npm'));

gulp.task('3-build', () => build());

gulp.task('3-build-dep', gulp.series('2-npm-dep', '3-build'));

gulp.task('5-copy', () =>
    gulp.src([
        'src/build/*/**',
        'src/build/*',
        `!src/build/static/media/Alarm Systems.*.svg`,
        `!src/build/static/media/Amplifier.*.svg`,
        `!src/build/static/media/Anteroom.*.svg`,
        `!src/build/static/media/Attic.*.svg`,
        `!src/build/static/media/Awnings.*.svg`,
        `!src/build/static/media/Balcony.*.svg`,
        `!src/build/static/media/Barn.*.svg`,
        `!src/build/static/media/Basement.*.svg`,
        `!src/build/static/media/Bathroom.*.svg`,
        `!src/build/static/media/Battery Status.*.svg`,
        `!src/build/static/media/Bedroom.*.svg`,
        `!src/build/static/media/Boiler Room.*.svg`,
        `!src/build/static/media/Carport.*.svg`,
        `!src/build/static/media/Ceiling Spotlights.*.svg`,
        `!src/build/static/media/Cellar.*.svg`,
        `!src/build/static/media/Chamber.*.svg`,
        `!src/build/static/media/Chandelier.*.svg`,
        `!src/build/static/media/Climate.*.svg`,
        `!src/build/static/media/Coffee Makers.*.svg`,
        `!src/build/static/media/Cold Water.*.svg`,
        `!src/build/static/media/Computer.*.svg`,
        `!src/build/static/media/Consumption.*.svg`,
        `!src/build/static/media/Corridor.*.svg`,
        `!src/build/static/media/Curtains.*.svg`,
        `!src/build/static/media/Dining Area.*.svg`,
        `!src/build/static/media/Dining Room.*.svg`,
        `!src/build/static/media/Dining.*.svg`,
        `!src/build/static/media/Dishwashers.*.svg`,
        `!src/build/static/media/Doors.*.svg`,
        `!src/build/static/media/Doorstep.*.svg`,
        `!src/build/static/media/Dressing Room.*.svg`,
        `!src/build/static/media/Driveway.*.svg`,
        `!src/build/static/media/Dryer.*.svg`,
        `!src/build/static/media/Entrance.*.svg`,
        `!src/build/static/media/Equipment Room.*.svg`,
        `!src/build/static/media/Fan.*.svg`,
        `!src/build/static/media/Floor Lamps.*.svg`,
        `!src/build/static/media/Front Yard.*.svg`,
        `!src/build/static/media/Gallery.*.svg`,
        `!src/build/static/media/Garage Doors.*.svg`,
        `!src/build/static/media/Garage.*.svg`,
        `!src/build/static/media/Garden.*.svg`,
        `!src/build/static/media/Gates.*.svg`,
        `!src/build/static/media/Ground Floor.*.svg`,
        `!src/build/static/media/Guest Bathroom.*.svg`,
        `!src/build/static/media/Guest Room.*.svg`,
        `!src/build/static/media/Gym.*.svg`,
        `!src/build/static/media/Hairdryer.*.svg`,
        `!src/build/static/media/Hall.*.svg`,
        `!src/build/static/media/Handle.*.svg`,
        `!src/build/static/media/Hanging Lamps.*.svg`,
        `!src/build/static/media/Heater.*.svg`,
        `!src/build/static/media/Home Theater.*.svg`,
        `!src/build/static/media/Hoods.*.svg`,
        `!src/build/static/media/Hot Water.*.svg`,
        `!src/build/static/media/Humidity.*.svg`,
        `!src/build/static/media/Iron.*.svg`,
        `!src/build/static/media/Irrigation.*.svg`,
        `!src/build/static/media/Kitchen.*.svg`,
        `!src/build/static/media/Laundry Room.*.svg`,
        `!src/build/static/media/Led Strip.*.svg`,
        `!src/build/static/media/Light.*.svg`,
        `!src/build/static/media/Lightings.*.svg`,
        `!src/build/static/media/Living Area.*.svg`,
        `!src/build/static/media/Living Room.*.svg`,
        `!src/build/static/media/Lock.*.svg`,
        `!src/build/static/media/Locker Room.*.svg`,
        `!src/build/static/media/Louvre.*.svg`,
        `!src/build/static/media/Mowing Machine.*.svg`,
        `!src/build/static/media/Music.*.svg`,
        `!src/build/static/media/names.*.txt`,
        `!src/build/static/media/Nursery.*.svg`,
        `!src/build/static/media/Office.*.svg`,
        `!src/build/static/media/Outdoor Blinds.*.svg`,
        `!src/build/static/media/Outdoors.*.svg`,
        `!src/build/static/media/People.*.svg`,
        `!src/build/static/media/Playroom.*.svg`,
        `!src/build/static/media/Pool.*.svg`,
        `!src/build/static/media/Power Consumption.*.svg`,
        `!src/build/static/media/Printer.*.svg`,
        `!src/build/static/media/Pump.*.svg`,
        `!src/build/static/media/Rear Wall.*.svg`,
        `!src/build/static/media/Receiver.*.svg`,
        `!src/build/static/media/Sconces.*.svg`,
        `!src/build/static/media/Second Floor.*.svg`,
        `!src/build/static/media/Security.*.svg`,
        `!src/build/static/media/Shading.*.svg`,
        `!src/build/static/media/Shed.*.svg`,
        `!src/build/static/media/Shutters.*.svg`,
        `!src/build/static/media/Sleeping Area.*.svg`,
        `!src/build/static/media/SmokeDetector.*.svg`,
        `!src/build/static/media/Sockets.*.svg`,
        `!src/build/static/media/Speaker.*.svg`,
        `!src/build/static/media/Stairway.*.svg`,
        `!src/build/static/media/Stairwell.*.svg`,
        `!src/build/static/media/Storeroom.*.svg`,
        `!src/build/static/media/Stove.*.svg`,
        `!src/build/static/media/Summer House.*.svg`,
        `!src/build/static/media/Swimming Pool.*.svg`,
        `!src/build/static/media/Table Lamps.*.svg`,
        `!src/build/static/media/Temperature Sensors.*.svg`,
        `!src/build/static/media/Terrace.*.svg`,
        `!src/build/static/media/Toilet.*.svg`,
        `!src/build/static/media/Tv.*.svg`,
        `!src/build/static/media/Upstairs.*.svg`,
        `!src/build/static/media/Vacuum Cleaner.*.svg`,
        `!src/build/static/media/Ventilation.*.svg`,
        `!src/build/static/media/Wardrobe.*.svg`,
        `!src/build/static/media/Washing Machines.*.svg`,
        `!src/build/static/media/Washroom.*.svg`,
        `!src/build/static/media/Water Consumption.*.svg`,
        `!src/build/static/media/Water Heater.*.svg`,
        `!src/build/static/media/Water.*.svg`,
        `!src/build/static/media/Wc.*.svg`,
        `!src/build/static/media/Weather.*.svg`,
        `!src/build/static/media/Window.*.svg`,
        `!src/build/static/media/Windscreen.*.svg`,
        `!src/build/static/media/Workshop.*.svg`,
        `!src/build/static/media/Workspace.*.svg`,

    ])
        .pipe(gulp.dest('admin/')));

gulp.task('5-copy-dep', gulp.series('3-build-dep', '5-copy'));

gulp.task('6-patch', () => new Promise(resolve => {
    if (fs.existsSync(`${__dirname}/admin/index.html`)) {
        let code = fs.readFileSync(`${__dirname}/admin/index.html`).toString('utf8');
        code = code.replace(/<script>var script=document\.createElement\("script"\)[^<]+<\/script>/,
            `<script type="text/javascript" src="./../../lib/js/socket.io.js"></script>`);

        fs.unlinkSync(`${__dirname}/admin/index.html`);
        fs.writeFileSync(`${__dirname}/admin/index_m.html`, code);
    }
    if (fs.existsSync(`${__dirname}/src/build/index.html`)) {
        let code = fs.readFileSync(`${__dirname}/src/build/index.html`).toString('utf8');
        code = code.replace(/<script>var script=document\.createElement\("script"\)[^<]+<\/script>/,
            `<script type="text/javascript" src="./../../lib/js/socket.io.js"></script>`);

        fs.writeFileSync(`${__dirname}/src/build/index.html`, code);
    }
    resolve();
}));

gulp.task('6-patch-dep',  gulp.series('5-copy-dep', '6-patch'));

gulp.task('default', gulp.series('6-patch-dep', 'widget-build'));
