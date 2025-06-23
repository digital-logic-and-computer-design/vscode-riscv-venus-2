##### Test the RGB LED

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

done:
    j done

delay:
   li t5, 300
delay_loop:
    addi t5, t5, -1
    bnez t5, delay_loop
    jr ra