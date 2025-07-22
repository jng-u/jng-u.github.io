import { browser } from '$app/environment'

class Theme {
	current = $state(browser && localStorage.getItem('color-scheme'))

	toggle = () => {
		const theme = this.current === 'dark' ? 'light' : 'dark'
		document.documentElement.setAttribute('data-theme', theme)
		localStorage.setItem('color-scheme', theme)
		this.current = theme
	}
}

export const theme = new Theme()
