# TODO: CSE 2600

- Add Extension support for RGB LED ecalls (Read, Write)
- Add Extensions support for UART (read / write)
    - Read returns -1 or byte 
    - Write is instant (simulate a blocking write)
    - Requires a new call back mechanism to count cycles 
    - UART panes
        - Entry box (to RISC-V)
        - Pending / processing box (showing current)
        - Have a "flush" button
        - Console (output from RISC-V) --- Include Hex display (maybe toggle)
- Control "hidden" features in settings: 
    - Hide LED & Key
    - Hide RGB LED
    - Hide UART


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


Need to update venusDebug to:
* Support parameters to extensions 
    * hide for each of the three parts
    * Clocks-Per-Instruction, Clock Frequency, and Baud Rate
* Create steps method and register

venusRuntime:
* Allow listeners to register to listen for "steps"
