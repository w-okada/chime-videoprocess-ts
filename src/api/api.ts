

export const createMeeting = () => {
    return new Promise((resolve, reject) => {
        let req = new XMLHttpRequest();
        req.open('POST', "/meeting?", true);
        req.onload = function () {
            if (req.status === 201) {
                resolve(JSON.parse(req.responseText));
            } else {
                reject(new Error(req.statusText));
            }
        };
        req.onerror = function () {
            reject(new Error(req.statusText));
        };
        req.send();
    });
}

export const joinMeeting = (title:string, userName:string):Promise<any> => {
    return new Promise((resolve, reject) => {
        let req = new XMLHttpRequest();
        req.open('POST', "/join?title="+title+"&userName="+userName, true);
        req.onload = function () {
            if (req.status === 201) {
                resolve(JSON.parse(req.responseText));
            } else {
                reject(new Error(req.statusText));
            }
        };
        req.onerror = function () {
            reject(new Error(req.statusText));
        };
        req.send();
    });
}

export const endMeeting = (title:string, userName:string) => {
    return new Promise<void>((resolve, reject) => {
        let req = new XMLHttpRequest();
        req.open('POST', "/end?title="+title+"&userName="+userName, true);
        req.onload = function () {
            if (req.status === 200) {
                resolve();
            } else {
                reject(new Error(req.statusText));
            }
        };
        req.onerror = function () {
            reject(new Error(req.statusText));
        };
        req.send();
    });
}



