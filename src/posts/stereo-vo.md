---
title: Stereo Visual Odmetry
description: Stereo Visual Odmetry
date: '2022-01-05'
tags:
- SLAM
published: true
---

다음 블로그 포스트의 글을 정리한 것 입니다. [Link](https://avisingh599.github.io/vision/visual-odometry-full/)  
블로그에는 MATLAB코드로 구현한 내용도 있습니다만 이 글에서는 다루지 않습니다.

### Odomerty란 무엇인가?

자동차에서 거리재는 그 것 — Odometer라고 부름

로보틱스에서는 좀더 일반적인 의미로 사용됨

→ 단순히 거리를 재는 것 뿐만 아니라 움직인 모든 궤적을 의미

시간 $t$에 대해 로봇의 pose를 다음의 벡터로 표현가능 $[x^t\ y^t\ z^t\ \alpha^t\ \beta^t\ \gamma^t]$

> $\alpha^t\ \beta^t\ \gamma^t$ 는 Euler angle
> 
> 
> $x^t\ y^t\ z^t$ 는 Cartesian coordinates
> 

### Visual Odometry는 무엇인가?

움직이는 로봇의 궤적을 측정하는 데는 여러 방법이 있음

Visual Odoemtry는 그 중에 카메라를 통해 들어오는 video stream 을 이용해 6 DoF 궤적을 구하는 것

> 6 DoF (6 Degree of Freedom) : position과 orientation 움직임을 의미 (참조)[https://en.wikipedia.org/wiki/Six_degrees_of_freedom]
> 

카메라 1개를 사용하면 Monocular Visual Odometry 

카메라 2개를 사용하면 Stereo Visual Odometry

### Stereo? Monocular?

stereo와 monocular 둘 다 장단점이 있음

이 글에서는 Stereo를 중심으로 설명

Stereo의 장점은 정확한 궤적이 측정 가능함

Monocular는 scale factor에 따라 궤적을 측정 가능

> 이게 무슨 소리냐면 Monocular는 x, y로 1unit만큼이 이동했다를 측정 가능
> 
> 
> Stereo는 x, y로 몇 meter이동했는지 정확하게 측정 가능
> 

그런데 로봇과 오브젝트의 거리가 엄청 멀어지면 Stereo의 장점이 사라짐

로봇이 작아질수록 monocular가 더 의미있을 수 있음

### 수학에 대해 얘기해보자

#### 문제를 공식화

**Input**

$I^t_l, I^t_r, I^{t+1}_l, I^{t+1}_r$

$I$는 이미지

윗 첨자 $t, t+1$은 시간

아래 첨자 $l, r$은 왼쪽 카메라와 오른쪽 카메라를 의미

카메라 내부, 외부의 Calibration parameter는 알고있다고 가정

**output**

$R$ 회전 Matrix

$t$ 이동 vector

#### 알고리즘

1. 이미지 캡처: $I^t_l, I^t_r, I^{t+1}_l, I^{t+1}_r$
2. calibration, rectification.
3. disparity map $D^t, D^{t+1}$를 계산
4. FAST 알고리즘을 이용해 $I^t_l, I^{t+1}_l$에서 feature를 찾고 matching
5. disparity map $D^t, D^{t+1}$를 이용해 (4)에서 구한 feature의 3d position을 구함
→ point cloud $W^t, W^{t+1}$를 구할 수 있음  
6. 두 프레임에서 매치되는 point cloud들만 골라냄
7. (6)에서 구한 inlier를 이용해 $R, t$를 구함

#### **Undistortion, Rectification**

생략

#### **Disparity Map Computation**

생략

#### Feature Detection

이 글에서는 FAST corner detector를 사용 [Link](http://www.edwardrosten.com/work/fast.html)

SIFT에 비해 연산속도에 이득이 있음

> 공부 필요
> 

전체 이미지에 대해서 feature를 찾았을 때 몇몇 지역에 집중되어 있을 수 있음

따라서 전체 이미지를 grid로 나누어서 각 부분에서 20개의 feature를 구함

#### Feature Description and Matching

KLT Tracker를 이용 [Link](https://cecas.clemson.edu/~stb/klt/)

$\mathcal{F}^t$ : $I^t$ 에서의 features set

$\mathcal{F}^{t+1}$ : $I^{t+1}$ 에서의 features set

#### Triangulation of 3D PointCloud

$\mathcal{F}^t$ 와 $\mathcal{F}^{t+1}$ 의 실제세계에서의 좌표를 구해보자

reprojection Matrix $\mathbf{Q}$ :

$$
Q = \begin{bmatrix}
1   &   0   &   0   &   -c_x   \\
0   &   1   &   0   &   -c_y   \\
0   &   0   &   0   &   -f   \\
0   &   0   &   -1/T_x   &   0
\end{bmatrix}
$$

> $c_x$ : x-coordinate of the optical center of the left camera (in pixels)
> 
> 
> $c_y$ : y-coordinate of the optical center of the left camera (in pixels)
> 
> $f$ : focal length of the first camera
> 
> $T_x$ : The x-coordinate of the right camera with respect to the first camera (in meters)
> 

다음 같이 3D 좌표를 얻을 수 있음

$$
\begin{bmatrix}
X\\ Y\\ Z\\ 1
\end{bmatrix}
=
\mathbf{Q} \times
\begin{bmatrix}
x\\ y\\ d\\ 1
\end{bmatrix}

$$

#### The Inlier Detection Step

우리가 사용한 알고리즘은 다른 것들하고 다르게 outlier detection 부분이 없음

대신 inlier를 찾음

우리는 scene이 고정적이고 시간에 따라 변하지 않는다고 가정했을 때 $\mathcal{W}^{t}$에서의 두 feature 사이의 거리는 $\mathcal{W}^{t+1}$에서의 거리와 같음

만약 둘이 다르다면 적어도 둘 중에 하나는 error라고 판단할 수 있음

따라서 우리는 consistency matrix $\mathbf{M}$ 을 구할 수 있음

$$
\mathbf{M}_{i,j} = \begin{cases}
1, &\text{if the distance between } i \text{ and } j \text{ points is same in both the point clouds}\\
0, &\text{otherwise}
\end{cases}
$$

우리는 이제 원래 포인트 클라우드에서 $\mathbf{M}$이 1인 가장 큰 subset을 구하기 원함

문제는 $\mathbf{M}$을 adjacency matrix로 사용하는 Maximum Clique Problem과 동일합니다.

cliques는 기본적으로 graph의 subset인데, 이것은 서로 연결된 노드들만 포함한다.

> 
> 

이 문제는 NP-Complete문제에 속하기 때문에 최적해를 구할 수 없다.

따라서 우리는 Greedy heuristic을 사용

1. maximum degree를 가진 노드를 선택, 이 노드를 포함하는 clique를 생성한다.
2. 존재하는 clique에서 clique에 존재하는 모든 노드와 연결된 subset $v$를 찾음
3. $v$안에서 다른 노드들과 가장 많이 연결된 노드를 찾음. 더이상 노드가 더해지지 않을 때 까지 (2)에서 반복

#### $R$ 과 $t$ 계산

다음의 식을 최소화하는 $R$ 과 $t$ 를 구하기 위해 Levenberg-Marquardt non-linear least squares minimization을 사용

$$
\epsilon = \sum_{\mathcal{F}^t, \mathcal{F}^{t+1}} (\mathbf{j_t-PTw_{t+1}})^2 + (\mathbf{j_{t+1}-P^{-1}Tw_{t}})^2
$$

> $\mathcal{F}^{t}, \mathcal{F}^{t+1}$ : 왼쪽 이미지의 features
$\mathbf{j_t}, \mathbf{j_{t+1}}$ : features의 2D Homogeneous Coordinates
$\mathbf{w_t}, \mathbf{w_{t+1}}$ :  features의 3D Homogeneous Coordinates
> 
> 
> $\mathbf{P}$ : 왼쪽 카메라의 3 X 4 프로젝션 매트릭스
> 
> $\mathbf{T}$ : 4 X 4 Homogeneous Transform 매트릭스
> 

#### Validation of results

아래의 조건을 만족한다면  $R$ 과 $t$ 는 valid 하다고 할 수 있음

1. clique에 있는 features의 수가 적어도 8개 이상
2. reprojection error $\epsilon$ 이 특정 threshold 보다 낮음