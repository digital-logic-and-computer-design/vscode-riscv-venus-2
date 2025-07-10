# https://github.com/kvakil/venus/wiki/Environmental-Calls
# 1 = print_int (signed)
li a0, 1
li a1, -123
ecall

### Print a string

li a0, 4 
la a1, teststring
ecall

## Print a character 
li a0, 11
li a1, 'A'
ecall

li a0, 11
li a1, '\n'
ecall

# Getting input 

# Setup
    li a0, 0x130
    ecall 

read_loop:
    li a0, 0x131  # Read character from input 
    ecall
    li t1, 1     # Check if input is 1 (no input)
    beq a0, t1, empty  # If -1, go to
    li t1, 0
    beq a0, t1, all_read  # If 0, continue reading
    li t1, 2
    beq a0, t1, one_char  # If 2, continue reading
    j read_loop

empty:
#    li a0, 4  # Print empty string
#    la a1, empty_string
#    ecall   
    j read_loop

one_char:
    li a0, 4  # Print one character
    mv t0, a1
    la a1, one_char_string
    ecall
    mv a1, t0
    li a0, 11  # Print the character
    ecall   
    j read_loop

all_read:
    li a0, 4  # Print newline
    la a1, all_read_string
    ecall
    j done

done:
    j done

.data
newline: .asciiz "\n"
teststring: .asciiz "\nHello, World!\n"
empty_string: .asciiz "\nNo input received.\n"
one_char_string: .asciiz "\nYou entered one character: "
all_read_string: .asciiz "\nRead all characters.\n"