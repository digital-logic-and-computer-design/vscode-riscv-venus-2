
#### Test the LED & Key Board's features

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

   # Shift left and update
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
    li t0,1   # If right-most button is pressed, move on
    beq a0,t0, after_button_loop
    li a0, 0x150
    ecall
    j button_loop

after_button_loop:

done:
    j done


delay:
   li t5, 150
delay_loop:
    addi t5, t5, -1
    bnez t5, delay_loop
    jr ra 


.data 
message: .asciiz "`~<>?:{}_+|-=\[];',/.abcdefghijklmnopqrstuvwxyz1234567890()*&^%$#@!ABCDEFGHIJKLMNOPQRSTUVWXYZ"
new_line: .asciiz "\n"
read: .space 20