# EcomeceFrontend

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.3.8.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Testing on a phone over Wi-Fi

Start the Strapi backend on the PC at port `1337`, then run `npm run start:host0000`.
Open `http://<PC-LAN-IP>:4200` on a phone connected to the same network.
The development configuration uses the browser's origin and `proxy.conf.json` to forward
`/api/**` and `/uploads/**` to Strapi on the PC, so the phone does not need to access port `1337`.
Restart the Angular dev server after changing its proxy configuration.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
