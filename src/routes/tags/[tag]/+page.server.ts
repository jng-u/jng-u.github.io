import type { PageServerLoad } from './$types';
import type { Post } from '$lib/types';
import { getPosts } from '$lib/server/posts';

export const load: PageServerLoad = async ({ params }) => {
    const { tag } = params; 

    const posts: Post[] = await getPosts(); 
    const filteredPosts = posts.filter((post) => post.tags.includes(tag));

    return {
        tag,
        posts: filteredPosts,
    };
};
