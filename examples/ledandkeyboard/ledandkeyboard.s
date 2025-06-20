

    li t4, 10

repeat_loop:
        li t1, 0
        la t0, message 
        li a0, 0x170
    print_loop:
        add t2,t0,t1 
        lb a1, 0(t2)
        ecall
        addi t1,t1,1
        bnez a1, print_loop

    la t0, new_line, 
    li a0, 0x170
    lb a1, 0(t0)
    ecall

    addi t4, t4, -1
    bnez t4, repeat_loop

# Set RGB LEDs
li a0, 0x160
li a1, 0xFF0000 
ecall

rgbLoop:
    call delay
    li a0, 0x161
    ecall
    mv a1, a0 
    srli a1, a1, 2
    li a0, 0x160
    ecall
    bnez a1, rgbLoop

# Set LEDs at top

li a0, 0x150
li a1, 0b10101010
ecall

# Get the LEDs at the top and shift over 
led_loop:
   call delay 

   # Get old value 
   li a0, 0x151
   ecall

   # Shift left abd update
   slli a1, a0, 1
   li a0, 0x150
   ecall
 
   bnez a1, led_loop

# Test digits

# Set initial light:
li a0, 0x152
li a1, 1
ecall 

dig03_loop:
    call delay

    # Get old value 
    li a0, 0x153
    ecall 

    # Shift left and update
    slli a1, a0, 1
    li a0, 0x152
    ecall

    bnez a1, dig03_loop

# Set initial light:
li a0, 0x154
li a1, 0x80000000
ecall 

dig47_loop:
    call delay

    # Get old value 
    li a0, 0x155
    ecall 

    # Shift left and update
    srli a1, a0, 1
    li a0, 0x154
    ecall

    bnez a1, dig47_loop

button_loop:
    # Copy button to LEDs
    li a0, 0x156
    ecall
    mv a1,a0
    li a0, 0x150
    ecall
    j button_loop

# Set RGB LEDs
li a0, 0x160
li a1, 0x00FF00 
ecall


delay:
   li t5, 300
delay_loop:
    addi t5, t5, -1
    bnez t5, delay_loop
    jr ra 


.data 
message: .asciiz "`~<>?:{}_+|-=\[];',/.abcdefghijklmnopqrstuvwxyz1234567890()*&^%$#@!ABCDEFGHIJKLMNOPQRSTUVWXYZ"
new_line: .asciiz "\n"