dkurniawan3
=====================

This is the source code of my personal website/blog, which is a static website generated using [Metalsmith][].


Build
-----

### Setup ###

 * Install [Node.js][] v4
 * Install Gulp: `npm install -g gulp`
 * Install dependencies: `npm install`

### Tasks ###

Available build tasks:

 * `gulp` - build the website, start a server and watch for changes (implicit --watch flag).
 * `gulp build` - build the website.
 * `gulp server` - build the website and start a server.
 * `gulp alex` - run [Alex][] over all the content.

#### Flags ####

The following command line flags can also be added to tasks:

 * `--prod` - production build (minified).
 * `--watch` - watch for changes.

[Metalsmith]: http://www.metalsmith.io/
[Node.js]: http://nodejs.org/
[Alex]: http://alexjs.com/
