li a0, 0x150
li a1, 0b10101010
ecall


li t1, 1

next0:
li a0, 0x152
mv a1, t1 
ecall
slli t1, t1, 1
bne t1, zero, next0

li t1,1
next1:
li a0, 0x154
mv a1, t1 
ecall
slli t1, t1, 1
bne t1, zero, next1




loop:
li a0, 0x156
ecall
mv a1,a0
li a0, 0x150
ecall
j loop
