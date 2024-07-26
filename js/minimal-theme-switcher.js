/*!
 * Minimal theme switcher
 *
 * Pico.css - https://picocss.com
 * Copyright 2019-2024 - Licensed under MIT
 */

const themeSwitcher = {
    // Config
    elementID: "theme-toggle",
    rootAttribute: "data-theme",
    localStorageKey: "picoPreferredColorScheme",
    
    // Init
    init() {
        if (window.localStorage?.getItem(this.localStorageKey) == "light") {
            document.getElementById(this.elementID).click();
        }
        this.initSwitchers();
    },

    // Init switchers
    initSwitchers() {
        checkbox = document.getElementById(this.elementID);
        checkbox.addEventListener(
            "click",
            (event) => {
                // Set scheme
                this.scheme = (checkbox.checked)? "light" : "dark";
                this.applyScheme();
                this.schemeToLocalStorage();
            },
            false
        );
    },
  
    // Apply scheme
    applyScheme() {
        document.querySelector("html")?.setAttribute(this.rootAttribute, this.scheme);
    },
  
    // Store scheme to local storage
    schemeToLocalStorage() {
        window.localStorage?.setItem(this.localStorageKey, this.scheme);
    },
};
  
// Init
themeSwitcher.init();
  