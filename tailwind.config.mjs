/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			screens: {
				'sm': '740px',
				// => @media (min-width: 640px) { ... }

				'md': '768px',
				// => @media (min-width: 768px) { ... }

				'lg': '1024px',
				// => @media (min-width: 1024px) { ... }

				'xl': '1280px',
				// => @media (min-width: 1280px) { ... }

				'2xl': '1536px',
				// => @media (min-width: 1536px) { ... }
			},
			aspectRatio: {
				"hero-desktop": '16 / 5',
				"hero-mobile": '1 / 2',
			},
			colors: {
				"base": 			"rgb(033 033 033 / <alpha-value>)",
				"coolBlue": {
					DEFAULT: 		"rgb(032 084 147 / <alpha-value>)",
					"light": 		"rgb(071 115 170 / <alpha-value>)",
					"lighter": 		"rgb(139 166 202 / <alpha-value>)",
					"lightest": 	"rgb(220 228 239 / <alpha-value>)",
				},
				"focus": 			"rgb(174 176 181 / <alpha-value>)",
				"gold": {
					DEFAULT: 		"rgb(255 157 030 / <alpha-value>)",
					"light": 		"rgb(249 170 067 / <alpha-value>)",
					"lighter": 		"rgb(255 195 117 / <alpha-value>)",
					"lightest": 	"rgb(255 235 209 / <alpha-value>)",
				},
				"gray": {
					DEFAULT: 		"rgb(091 097 107 / <alpha-value>)",
					"dark": 		"rgb(050 058 069 / <alpha-value>)",
					"light": 		"rgb(174 176 181 / <alpha-value>)",
					"lighter": 		"rgb(214 215 217 / <alpha-value>)",
				"lightest": 		"rgb(241 241 241 / <alpha-value>)",
					"warmDark": 	"rgb(073 068 064 / <alpha-value>)",
					"warmLight": 	"rgb(228 226 224 / <alpha-value>)",
					"coolLight": 	"rgb(220 228 239 / <alpha-value>)",
				},
				"green":{
					DEFAULT: 		"rgb(046 133 064 / <alpha-value>)",
					"light": 		"rgb(074 165 100 / <alpha-value>)",
					"lighter": 		"rgb(148 191 162 / <alpha-value>)",
				"lightest": 		"rgb(231 244 228 / <alpha-value>)",
				},
				primary: {
					DEFAULT: 		"rgb(016 091 216 / <alpha-value>)",
					"darker": 		"rgb(011 061 145 / <alpha-value>)",
					"darkest": 		"rgb(006 031 074 / <alpha-value>)",
					"alt": 			"rgb(002 191 231 / <alpha-value>)",
					"altDark": 		"rgb(000 166 210 / <alpha-value>)",
					"altDarkest": 	"rgb(004 107 153 / <alpha-value>)",
					"altLight": 	"rgb(155 218 241 / <alpha-value>)",
					"altLightest": 	"rgb(225 243 248 / <alpha-value>)",
				},
				secondary: {
					DEFAULT: 		"rgb(221 054 028 / <alpha-value>)",
					"dark": 		"rgb(198 045 031 / <alpha-value>)",
					"darkest": 		"rgb(153 035 027 / <alpha-value>)",
					"light": 		"rgb(229 152 146 / <alpha-value>)",
				"lightest": 		"rgb(249 224 222 / <alpha-value>)",

				},
				"visited": 			"rgb(076 044 146 / <alpha-value>)",
			},
		},
	},

	plugins: [],
}
