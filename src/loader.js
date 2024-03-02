
import { fetchDataFromJsonFile } from "./json-utils.js";
window.onload = ()=>{
	//console.log("window.onload called");
	// 1 - do preload here - load fonts, images, additional sounds, etc...
	fetchDataFromJsonFile("data/media.json");
}