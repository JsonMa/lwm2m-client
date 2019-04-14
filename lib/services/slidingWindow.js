'use strict';

function createSlidingWindow(size) {
    var window = {
        data: new Array(size),
        header: 0
    };

    function containNumber(number) {
        if (window.data.indexOf(number) < 0) {
            return false;
        } else {
            return true;
        }
    }

    function pushNumber(number) {
        window.data[window.header] = number;
        window.header = (window.header++)%window.data.length;
    }

    return {
        contains: containNumber,
        push: pushNumber
    };
}

module.exports = createSlidingWindow;