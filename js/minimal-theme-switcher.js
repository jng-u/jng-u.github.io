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
    
    // Init
    init() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.getElementById(this.elementID).checked = false;
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
            },
            false
        );
    },
  
    // Apply scheme
    applyScheme() {
        document.querySelector("html")?.setAttribute(this.rootAttribute, this.scheme);
    }
};
  
// Init
themeSwitcher.init();
  