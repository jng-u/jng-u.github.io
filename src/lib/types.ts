export type Post = {
	title: string
	slug: string
	description: string
	date: string
	tags: string[]
	published: boolean
}

export type AboutProfile = {
	img: string
	name: string
	abstract: string
	research_interests: string
	skills: string
	contact: string
}

export type Education = {
	school: string
	start: string
	end: string
	description: string
}

export type Experience = {
	job_team: string
	start: string
	end: string
	work: string
	tools: string
}

export type Talk = {
	date: string
	where: string
	link: string
	title: string
}

export type Award = {
	year: string
	contest: string
	prize: string
}

export type AboutData = {
	profile: AboutProfile
	education: Education[]
	experiences: Experience[]
	talks: Talk[]
	awards: Award[]
}
