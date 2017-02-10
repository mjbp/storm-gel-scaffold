import CONSTANTS from './constants';
import Toggler from './require/toggler';
import Load from 'storm-load';

const onDOMContentLoadedTasks = [
	//Toggler
];

//attach anything you wish to expose on a window level here
//global.UI = {};

if('addEventListener' in window)
	onDOMContentLoadedTasks.length && window.addEventListener('DOMContentLoaded', onDOMContentLoadedTasks.forEach(fn => fn()));
	//onLoadTasks.length && window.addEventListener('load', () => { onLoadTasks.forEach((fn) => fn()); });