import { ClientFunction } from 'testcafe'

module.exports = {
    // Increment a letter; used by getNewName()
    getNextChar: function (char) {
        if (char === 'z') {
            return 'a';
        }

        if (char === 'Z') {
            return 'A';
        }

        return String.fromCharCode(char.charCodeAt(0) + 1);
    },

    // Transform a device name by incrementing its last letter
    getNewName: function (originalName) {
        const prefix = originalName.substring(0, originalName.length - 1)
        const lastChar = originalName.substring(originalName.length - 1)
        return prefix + this.getNextChar(lastChar)
    },

    // Get the current URL from the browser
    getPageUrl: ClientFunction(() => window.location.href),

    // Reload the current page
    reloadPage: ClientFunction(() => location.reload())
}
