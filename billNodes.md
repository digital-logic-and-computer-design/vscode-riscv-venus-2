# Setup

```
npm install
git submodule init
git submodule update
```

Install Java version 11 (https://www.oracle.com/java/technologies/javase/jdk11-archive-downloads.html)

# Building

```
export JAVA_HOME=`/usr/libexec/java_home -v 11.0` 
npx grunt buildvenus
```

Setup Java version in command prompt BEFORE launch (the `export`)