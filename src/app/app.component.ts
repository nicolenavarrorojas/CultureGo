import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { SplashComponent } from './shared/components/splash/splash.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, SplashComponent],
})
export class AppComponent {
  constructor() {}
}
