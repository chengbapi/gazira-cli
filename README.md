gazira-cli
==========

quickly to build a project which uses gazira

## install

    $ npm install gazira-cli -g
    
## useage

### initiliaze

    # under your project directory, and type this command
    $ gazira init static

    # build cache only
    $ gazira init -c

    # initiliaze and install dependencives
    $ gazira init -d

### update

    $ gazira update static

### update template

    # update all template files: Gruntfile.js, package.json, js/src/app/common.js, js/config.js
    $ gazira updateTemplate

    # only update Gruntfile.js
    $ gazira updateTemplate Gruntfile.js
    
### help

    $ gazira
    # or
    $ gazira -h
