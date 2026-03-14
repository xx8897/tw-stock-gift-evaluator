// 核心切分後的 UI 入口檔案
window.initUI = function() {
    console.debug("[UI] initUI start");
    try {
        if (typeof window.initModals === "function") window.initModals();
        if (typeof window.initFilters === "function") window.initFilters();
        if (typeof window.initTableEvents === "function") window.initTableEvents();
        console.debug("[UI] initUI done");
    } catch (e) {
        console.error("[UI] initUI failed", e);
        throw e;
    }
};
