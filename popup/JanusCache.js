export default class JanusCache {
    /** @param {string} key*/
    static readJsonFromStorage(key) {
        try {
            const raw = localStorage.getItem(key)
            return raw ? JSON.parse(raw) : null
        } catch (error) {
            console.warn(`Failed to read ${key}`, error)
            return null
        }
    }

    /**
     * @param {string} key
     * @param {string} value
     */
    static writeJsonToStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value))
        } catch (error) {
            console.warn(`Failed to persist ${key}`, error)
        }
    }
}
