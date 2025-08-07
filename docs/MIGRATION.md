# Gatsby to Next.js Migration

## MDX Loading and Processing

By and large, replicating MDX content processing was the most difficult part of the migration process. I replicated the functionality of the `gatsby-node.ts` by separating the logic into different files inside the [lib/](../src/lib) directory. Below, I detail how I replicated each part of the logic.

### Node Creation

The `onCreateNode` function of the `gatsby-node.ts` file was responsible for loading and creating the GraphQL data for the `.mdx` and `.json` files from the `content/` and `solutions/` directories. Because Next.js doesn’t use GraphQL, I had to replicate the GraphQL types from the `graphql-types.ts` file in the [content.ts](../src/types/content.ts) file. Next, I had to load the data.

In the [loadContent.ts](../src/lib/loadContent.ts) file, I created utility functions to load MDX content from the [content/](../content/) and [solutions/](../solutions/) directories. These MDX processing utility functions rely on the [parseMdxFile.ts](../src/lib/parseMdxFile.ts) file. The [parseMdxFile.ts](../src/lib/parseMdxFile.ts) file replicates the functionality of the `create-xdm-node.ts` file, with some changes:

1.  Created new [remarkExtractImages](../src/mdx-plugins/remark-extract-images.js) plugin to replace `gatsbyImage` plugin. My implementation can be improved to better match the original `gatsby-plugin-img`
2.  Updated `remarkAutolinkHeadings` to `rehypeAutolinkHeadings`
3.  Updated `remarkSlug` to `rehypeSlug`
4.  Updated `remarkExternalLinks` to `rehypeExternalLinks`
5.  Modified all files in [mdx-plugins/](../src/lib/parseMdxFile.ts) to use ESM syntax rather than CommonJS syntax because `require()` and `module.exports` were causing errors.

I also created utility functions to load and parse the problem JSON data from the [content/](../content/) directory.This function checks that problems not in the [extraProblems.json](..\content\extraProblems.json) file (module problems) have corresponding module ids. The function also processes the problems in[extraProblems.json](..\content\extraProblems.json).

The [**tests**/](../src/lib/__tests__/) directories contains the scripts to test the loading functions in the [loadContent.ts](../src/lib/loadContent.ts) file.

### Data Validation

The `validateProblemConsistency` function in [validateData.ts](../src/lib/validateData.ts) essentially replicates the logic of `gatsby-node.ts:264-325`, ensuring that problems aren’t sharing ids, urls, etc.

The `validateSolutionRelationships` function essentially replicates the logic of `gatsby-node.ts:402:484`, ensuring that problems that have claim to have internal solutions actual do.

The `validateModuleProblems` function can be ignored.

**Note**

- I used Maps to act as caches for the loaded data. These in-memory caches will be useful during build time, but they essentially have no effect during development mode because a new process is created to load the data each time. I will try to implement caching for development by conditionally saving the loaded data as JSON files to the `public/` directory (in the future).

## Pages Creation

Pages that have brackets in their file path (e.g. `[value]`) will use `getStaticPaths` to dynamically load. Pages that require data from the [lib/](../src/lib) will use `getStaticProps`.`getStaticPaths` and `getStaticProps` run during build time on the server, which will reduce load on the client.

`getStaticPaths` essentially replaces `createPage`, and `getStaticProps` essentially replaces the GraphQL queries.

The [SEO ](../src/components/seo.tsx) component has been adapted to use `next/router` and `next/head`. Otherwise, the functionality stays the same.

**Note**

- I need to configure redirects for the pages.

- Because the `Map` can’t be passed as props due to serialization issues, I convert the map into JSON. (Another solution can probably be implemented)

## Image Processing

The new [remarkExtractImages](../src/mdx-plugins/remark-extract-images) plugin attempts to mimic the `gatsby-plugin-img.js` functionality. Many features, such as lazy loading, `srcset`, etc. are already built into `next/image`. However, the image processing is still needed to extract captions and `ImageMetadata`.

While the [remark-extract-images.js](../src/mdx-plugins/remark-extract-images.js) file handles node traversal, the [imageUtils.ts](../src/lib/imageUtils.ts) file handles the processing of `ImageMetadata`, along with creating a base64 URL.

The `cachedImages` map in [loadContent.ts](../src/lib/loadContent.ts) stores image `src`s as keys and `ExtractedImage`s as values. I created the [CachedImagesContext.tsx](../src/context/CachedImagesContext.tsx) file to avoid prop drilling, which allows me to serve the `cachedImages` to the custom [MarkdownImage.tsx](../src/components/markdown/MarkdownImage.ts) component.

**Note**

All static files have been moved to the [public/](../public/) directory because Next.js can only serve static files from there. I used the soon to be extant `migrate-imports.cjs` script to update change all relative imports to absolute imports in the [content/](../content/) and [solutions/](../solutions/) directories.

Below is a high level overview of steps that still need to be accomplished.

**TODO**

- Create syllabus pages
- Create solutions pages
- Create user solutions pages
- Configure redirects
- Copy over `api/` directory and convert Gatsby syntax to Next.js syntax
- Update algolia config for Next.js
- Create Problems pages
- Implement Groups
- Implement editor
- copy over all other components/scripts/utils
- Update storybook config for next.js
- copy over stories
- update deployment scripts
- update docs
