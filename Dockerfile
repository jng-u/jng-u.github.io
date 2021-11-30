FROM ubuntu:20.04

# Kakao mirror 서버 연결
RUN sed -i 's/archive.ubuntu.com/mirror.kakao.com/g' /etc/apt/sources.list
RUN apt -y update

# install zsh
RUN apt -y install git wget zsh fonts-powerline language-pack-en
#   oh-my-zsh install 
RUN sh -c "$(wget -O- https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" 
RUN chsh -s /usr/bin/zsh 
#   install plugins
ENV ZSH_CUSTOM $HOME/.oh-my-zsh/custom
RUN git clone https://github.com/zsh-users/zsh-syntax-highlighting.git $ZSH_CUSTOM/plugins/zsh-syntax-highlighting
RUN git clone git://github.com/zsh-users/zsh-autosuggestions $ZSH_CUSTOM/plugins/zsh-autosuggestions
#   .zshrc file edit
RUN echo 'export LANG=en_US.UTF-8 ZSH="$HOME/.oh-my-zsh" ZSH_THEME="agnoster" plugins=(git zsh-syntax-highlighting zsh-autosuggestions)\nsource $ZSH/oh-my-zsh.sh\nprompt_context() {\n  if [[ "$USER" != "$DEFAULT_USER" || -n "$SSH_CLIENT" ]]; then\n    prompt_segment black default "%(!.%{%F{yellow}%}.)$USER"\n  fi\n}' > ~/.zshrc
CMD ["zsh"]

# install nodejs 
RUN apt -y install curl
RUN curl -fsSL https://deb.nodesource.com/setup_17.x | bash -
RUN apt -y install nodejs

# install gatsby
RUN npm install -g gatsby-cli


RUN apt update
RUN apt upgrade