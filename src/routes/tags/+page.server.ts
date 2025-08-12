import type { PageServerLoad } from './$types';
import type { Post } from '$lib/types'
import { getPosts } from '$lib/server/posts';

export const load: PageServerLoad = async ({ params }) => {
    let tagData: Record<string, number> = {};
	const posts: Post[] = await getPosts(); // 모든 posts를 가져옴

	// grouping
	tagData = posts.reduce((acc: Record<string, number>, post: Post) => {
		post.tags.forEach((tag) => {
			acc[tag] = (acc[tag] || 0) + 1;
		});
		return acc;
	}, {});

	// TODO - order by number of posts
    
	return tagData;
};