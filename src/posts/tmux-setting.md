---
title: tmux 세팅
description: tmux 세팅
date: '2022-02-06'
tags:
- Ubuntu
published: false
---

ROS를 이용해 개발을 하면서 터미널 창을 좀 더 자유롭게 사용하기 위해 tmux를 설치해 사용하는데, 
불편한 점이 있어 이를 세팅하는 과정을 정리했습니다.  
해결하지 못한 문제는 해결하는데로 수정하겠습니다.

1. 마우스 사용 설정
2. 클립보드 연동 및 tmux copy mode 키 세팅

---
### 설치
`Ubuntu 20.04` 기준입니다.  
아래의 명령어로 설치를 하면 됩니다.
```shell
sudo apt install tmux
```

### 설정 파일 생성
`~/.tmux.conf` 파일을 생성해줍니다.  
파일에 아래의 설정 내용을 복사해줍니다.

``` shell
# mouse 사용 설정
set-option -g mouse on
# vi모드 사용설정
setw -g mode-keys vi

# Use Alt-arrow keys without prefix key to switch panes
bind -n M-Left select-pane -L
bind -n M-Right select-pane -R
bind -n M-Up select-pane -U
bind -n M-Down select-pane -D

# Shift arrow to switch windows
bind -n S-Left  previous-window
bind -n S-Right next-window

# copy mode setting
# 좌클릭 드래그로 선택, 우클릭으로 복사
bind -T copy-mode-vi MouseDragEnd1Pane send-keys -X append-selection 'xclip -in -selection clipboard'
bind -T copy-mode-vi MouseDown1Pane send-keys -X clear-selection
bind -T copy-mode-vi MouseDown3Pane send-keys -X copy-pipe-and-cancel 'xclip -in -selection clipboard'

# 창 나누는거 기본으로 설정해두기
new -s new 
split-window -h -p 50
split-window -v -p 80
split-window -v -p 60
select-pane -t 0 
```

#### 클립보드 연동
tmux와 ubuntu가 원래는 클립보드를 따로 사용하기 때문에 이를 연동하기 위해서는
`xclip`을 설치하고 tmux에서 복사를 실행했을 때 따로 명령어를 실행해주어야 됩니다.  
위 설정 파일에서 `'xclip -in -selection clipboard'`가 그 내용에 해당되고, 우리는 xclip만 설치해주면 됩니다.
```shell
sudo apt install xclip
```

#### 자세한 내용들
다른 명령어들을 확인하려면 [링크](https://man7.org/linux/man-pages/man1/tmux.1.html)를 확인해보세요.
1. **마우스 사용 설정**  
 	tmux는 기본적으로 창을 나누고 이동할 때 `[Ctrl]+[b]+[방향키]` 를 이용하는데, 저는 이게 불편해서 마우스로 이동할 수 있도록 설정을 했습니다.  
2. **이동 키 설정**  
	위와 마찬가지로 `[Alt]+[방향키]`를 이용해도 이동할 수 있도록 했습니다.
3. **윈도우 변경**  
	탭과 비슷한 개념의 윈도우를 생성할 수 있는데 이를 이동할 때 `[Shift]+[좌우방향키]`를 이용할 수 있도록 했습니다.
4. **복사 설정**  
	tmux는 터미널의 내용을 복사하기 위해서는 기본적으로 copy-mode에 진입을 해야되는데, 
	마우스 사용 설정을 하면 기본적으로 터미널에서 마우스 사용했을 때 copy-mode에 자동으로 진입합니다.  
	저는 여기서 복사를 편하게 하기 위해서 좌클릭 드래그로 선택, 우클릭으로 복사가 되도록 설정을 했습니다.
5. **창을 나눈 상태로 시작**  
	저는 tmux시작하고 매번 창을 나누는게 귀찮아서 미리 명령어로 창을 나눈 상태로 시작하도록 session을 만드는 명령어를 추가해놓았습니다.

### 실행해보기
설정 파일을 만들었으면 tmux 명령어로 설정 파일을 지정해주어야 됩니다.
```shell
tmux source-file ~/.tmux.conf
```

설정 파일에서 new라는 세션을 만들도록 했기 때문에 `tmux attach` 명령어로 세션을 불러와 줍니다.
```shell
tmux attach -t new
```

다음과 같이 터미널이 만들어 진 것을 확인할 수 있습니다.
![](tmux.png)

### 문제점
1. 스크롤을 위로 올리고 좌클릭 드래그시 스크롤 맨 아래로 이동함

### 참고
1. https://dev.to/iggredible/the-easy-way-to-copy-text-in-tmux-319g
2. https://rampart81.github.io/post/vim-clipboard-share/
3. https://man7.org/linux/man-pages/man1/tmux.1.html
4. https://unix.stackexchange.com/questions/149606/how-do-i-create-a-simple-tmux-conf-that-splits-a-window
