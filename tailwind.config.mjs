/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			aspectRatio: {
				"hero-desktop": '16 / 5',
				"hero-mobile": '1 / 2',
			},
			colors: {
				"base": "rgba(33, 33, 33, 1)",
				"coolBlue": {
					DEFAULT: "rgba(32, 84, 147, 1)",
					"light": "rgba(71, 115, 170, 1)",
					"lighter": "rgba(139, 166, 202, 1)",
					"lightest": "rgba(220, 228, 239, 1)",
				},
				"focus": "rgba(174, 176, 181, 1)",
				"gold": {
					DEFAULT: "rgba(255, 157, 30, 1)",
					"light": "rgba(249, 170, 67, 1)",
					"lighter": "rgba(255, 195, 117, 1)",
					"lightest": "rgba(255, 235, 209, 1)",
				},
				"gray": {
					DEFAULT: "rgba(91, 97, 107, 1)",
					"dark": "rgba(50, 58, 69, 1)",
					"light": "rgba(174, 176, 181, 1)",
					"lighter": "rgba(214, 215, 217, 1)",
					"lightest": "rgba(241, 241, 241, 1)",
					"warmDark": "rgba(73, 68, 64, 1)",
					"warmLight": "rgba(228, 226, 224, 1)",
					"coolLight": "rgba(220, 228, 239, 1)",
				},
				"green":{
					DEFAULT: "rgba(46, 133, 64, 1)",
					"light": "rgba(74, 165, 100, 1)",
					"lighter": "rgba(148, 191, 162, 1)",
					"lightest": "rgba(231, 244, 228, 1)",
				},
				primary: {
					DEFAULT: "rgba(16, 91, 216, 1)",
					"darker": "rgba(11, 61, 145, 1)",
					"darkest": "rgba(6, 31, 74, 1)",
					"alt": "rgba(2, 191, 231, 1)",
					"altDark": "rgba(0, 166, 210, 1)",
					"altDarkest": "rgba(4, 107, 153, 1)",
					"altLight": "rgba(155, 218, 241, 1)",
					"altLightest": "rgba(225, 243, 248, 1)",
				},
				secondary: {
					DEFAULT: "rgba(221, 54, 28, 1)",
					"dark": "rgba(198, 45, 31, 1)",
					"darkest": "rgba(153, 35, 27, 1)",
					"light": "rgba(229, 152, 146, 1)",
					"lightest": "rgba(249, 224, 222, 1)",

				},
				"visited": "rgba(76, 44, 146, 1)",
			},
		},
	},

	plugins: [],
}
