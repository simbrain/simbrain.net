async function detectMacChip() {
    const userAgentString = navigator.userAgent
    const isChrome = userAgentString.indexOf("Chrome") > -1
    const isMacOS = userAgentString.indexOf("Mac OS") > -1
    const isWindows = userAgentString.indexOf("Windows") > -1
    if (isWindows) {
        return "Currently the Windows App is not signed. You may need to click 'More info' and then 'Run anyway'"
    }
    if (isMacOS) {
        if (isChrome) {
            const userAgentData = await navigator.userAgentData.getHighEntropyValues(['architecture'])
            if (userAgentData.architecture === "arm") {
                return "Note: Your browser is running on a Mac that is using an Apple Silicon chip"
            } else {
                return "Note: Your browser is running on a Mac machine that is using an Intel chip"
            }
        } else {
            return `
                    To see if your Mac is "Silicon", click "About This Mac" and look for a line that says
                    "Chip" or "Processor". If that line says M1, M2, M3, or M4, your Mac is Apple Silicon.
                    Otherwise it is Intel.
                `.replace(/\n/g, "").replace(/\s+/g, " ")
        }
    }
    return "";
}