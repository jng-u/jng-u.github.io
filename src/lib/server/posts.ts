import type { Post } from '$lib/types'

// 게시물 데이터를 불러오는 함수
export async function getPosts(): Promise<Post[]> {
    let posts: Post[] = [];

	const paths: Record<string, unknown> = import.meta.glob('/src/posts/*.md', { eager: true });

    for (const path in paths) {
        const file = paths[path];
        const slug = path.split('/').at(-1)?.replace('.md', '');

        if (file && typeof file === 'object' && 'metadata' in file && slug) {
            const metadata = file.metadata as Omit<Post, 'slug'>;
            const post = { ...metadata, slug } satisfies Post;

            if (post.published) {
                posts.push(post);
            }
        }
    }

	posts = posts.sort((first, second) =>
    	new Date(second.date).getTime() - new Date(first.date).getTime()
	);

    return posts;
}