import type { PageServerLoad } from './$types';
import type { Post } from '$lib/types';
import { getPosts } from '$lib/server/posts';

export const load: PageServerLoad = async ({ params }) => {
    const posts: Post[] = await getPosts(); // 모든 posts를 가져옴
    return { posts };
};
