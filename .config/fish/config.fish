alias pac=yay

# pacmatic needs to be run as root: https://github.com/keenerd/pacmatic/issues/35
alias pacmatic='sudo --preserve-env=pacman_program /usr/bin/pacmatic'

# Downgrade permissions as AUR helpers expect to be run as a non-root user. $UID is read-only in {ba,z}sh.
function yay --wraps pacman_program --description 'alias yay=pacman_program'
            pacman_program="sudo -u gugaa$UID /usr/bin/yay --pacman powerpill" pacmatic $argv
end

set -gx PATH $PATH $HOME/bin
