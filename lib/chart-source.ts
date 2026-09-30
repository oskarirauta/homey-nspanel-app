import { validateBinding } from './bindings';
export function isMetChart(options:any):boolean {return options?.chartSource==='met' || options?.binding?.source==='met' || options?.weatherForecast===true;}
export function validateChartOptions(options:any):void {
  if(!options)return;
  if(options.binding?.source==='met')return;
  // Legacy Spot was an example, not a provider. Preserve the values as explicit Flow data.
  if(options.binding?.source==='spot'){options.binding={source:'flow'};return;}
  if(options.binding)validateBinding(options.binding);
}
