import * as main from "./main.js";
export const fetchDataFromJsonFile = (jsonFilePath) => {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', jsonFilePath, true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            let data = JSON.parse(xhr.responseText);
            main.init(data);
        }
    };
    xhr.send();
}

