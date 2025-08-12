---
title: Monocular Visual Odmetry
description: Monocular Visual Odmetry
date: '2022-01-06'
tags:
- SLAM
published: true
---

다음 블로그 포스트의 글을 정리한 것 입니다. [Link](https://avisingh599.github.io/vision/monocular-vo/)  
이 글을 보기 전에 [이전 글](/posts/stereo-vo)을 보시는 것을 추천합니다. 

### Demo

### 문제 Formulation
**input**  
$I^t, I^{t+1}$  
$I$는 이미지  
윗 첨자 $t, t+1$은 시간

**output**  
$R$ 회전 Matrix  
$t$ 이동 vector

### 알고리즘 개요

1. 이미지 캡처: $I^t, I^{t+1}$.
2. camera calibration.
3. $I^t$ 에서 feature를 찾고 그것들을 $I^{t+1}$ 에서 tracking. 만약 feature의 수가 일정 threshold보다 아래로 떨어지면 다시 detect
4. RANSAC과 Nister의 5 point algorithm을 이용하여 essential matrix 계산
5. (4)에서 구한 essential matrix를 이용해 $R, t$ 를 구함
6. scale 정보를 외부의 정보(ex. 속도계)로 부터 구함, 이를 matrix에 합침

### Undistortion

생략

### Feature detection

FAST 알고리즘 사용

(이전 글에 설명 있음)

### Feature Tracking

KLT Tracker 사용

(이전 글에 설명 있음)

#### Feature Re-Detection

detection을 할 때 결국 움직이기 때문에 포인트의 수가 줄어들 수 밖에 없음

따라서 특정한 threshold값보다 feature가 적어지면 다시 detect하도록 함 (예시의 코드에서는 2000개)

### Essential Matrix Estimation

esseential matrix는 다음과 같이 정의될 수 있음

$$
y^T_1 E y_2 = 0
$$

> $y_1, y_2$ : homogeneous normalized image coordinates
> 

간단한 알고리즘이 8개의 point correspondences 요구하지만, 최근에 5개의 point 알고리즘이 더 좋은 결과를 보여준다고 한다.

#### RANSAC

만약의 모든 correspondence가 완벽하다면 5 point 알고리즘으로 frame과 frame사이의 움직임을 완벽하게 구할 수 있다. 하지만 현실은 완벽하지 않기 때문에 RANSAC과 같은 방법을 이용해 outlier를 제거함

 

### $R,t$ 구하기

Essetial matrix는 다음과 같이 표현 가능

$$
E = R[t]_x
$$

> $R$ : 회전 행렬
> 
> 
> $[t]_x$ : $t$ 와의 cross product
> 

$E$ 에 SVD를 적용하면

$$
E = U\Sigma V^T 
$$
$$
[t]_x = VW\Sigma V^T 
$$
$$
R = UW^{-1}V^T
$$

### Constructing Trajectory

우리는 경로를 다음과 같은 공식을 통해 구할 수 있다.

$$
R_{pos} = RR_{pos}
$$
$$
t_{pos} = t_{pos} + tR_{pos}
$$

### Heuristics

대부분의 컴퓨터 비전 알고리즘은 경험적인 부분을 포함하여 좀 더 완벽해진다.

Monocular Visual Odometry 에서는 **Dominant Motion is Forward**라는 원칙을 가진다.