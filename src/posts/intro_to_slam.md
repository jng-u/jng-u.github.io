---
title: Introduction to SLAM (Cyrill Stachniss)
description: Introduction to SLAM (Cyrill Stachniss)
date: '2021-12-20'
tags:
- SLAM
published: true
---

<script>
	import 'katex/dist/katex.min.css'
</script>

Cyrill Stachniss 교수님의 강의를 정리한 것입니다. [Youtube](https://youtu.be/0I30M6yTklo)

### What is SLAM?
로봇의 위치와 환경의 맵을 동시에 계산 하는것

- **Localization** : 로봇의 위치를 추정
- **Mapping** : 지도를 제작
- **SLAM** : Localization과 Mapping을 동시에 하는 것

정확한 Mapping 데이터가 있다면 Localization이 쉬움  
정확한 Localization 데이터가 있다면 Mapping이 쉬움  
→ 둘 다 해야되기 때문에 SLAM이 어렵다.

#### Localization Example
로봇의 위치를 주어진 Landmark로 보정
>별 : Landmark  
>흰색 동그라미 : 실제 로봇의 위치  
>회색 동그라미 : 인지된 로봇의 위치

![localization](localization.png)

#### Mapping Example
랜드마크를 로봇의 위치를 통해 추정
>흰색 동그라미 : 로봇의 위치  
>노란 별 : 실제 Landmark  
>회색 별 : 인지된 Landmark

![mapping](mapping.png)

#### SLAM Example
로봇의 위치와 Landmark를 모두 추정
> Loop Closure를 통해 Error 보정 가능

![slam](slam.png)

##### The SLAM Problem 
- **chicken-or-egg problem**  
	→ a map is needed for localization  
	→ a pose estimate is needed for mapping

<!-- ```math
x+y = 1
``` -->

$$
x + y = 1
$$

<!-- ### Definition of the SLAM Problem
- 주어진 데이터
	- The robot's control  
	$u_{1:T} = \{u_1, u_2, u_3, ..., u_T\}$ 
	- Observations  
	$z_{1:T} = \{z_1, z_2, z_3, ..., z_T\}$ 
- 원하는 것
	- Map of the environment  
	$m$
	- Path of the robot  
	$x_{0:T} = \{x_0, x_1, x_2, ..., x_T\}$ -->
<!-- 
#### Probabilistic Apprsoaches
robot's motion과 observations의 불확실성(uncertainty)를 표현하기 위해 확률 이론(probability theory)을 사용

따라서 SLAM Problem은 다음의 식으로 표현이 가능  
$$
p(x_{0:T}, m | z_{1:T}, u_{1:T})
$$
$p$ 는 probabilistic distribution을 의미 -->

<!-- #### Graphical Model
![graphical model](graphical-model.png)
변수들간의 dependency를 표현함

화살표는 어디서 어디로 impact를 주는지 의미  
ex) $u_t$와 $x_{t-1}$가 현재 위치 $x_t$에 영향을 줌

### Full SLAM vs. Online SLAM
- Full SLAM : estimate the entire path
	- $p(x_{0:T}, m | z_{1:T}, u_{1:T})$
	- 위의 Graphical Model이 Full SLAM을 의미
- Online SLAM : seeks to recover only the most recent pose
	- $p(x_t, m | z_{1:t}, u_{1:t})$

#### Graphical Model of Online SLAM
![](graphical-model-online-slam.png)
이전까지의 pose들로 marginalizing하는 것을 의미
> marginal probability : 모든 가능한 주변 확률의 경우의 수를 더해서 구하는 것을 의미
$$
\begin{align*}
&p(x_{t+1}, m | z_{1:t+1}, u_{1:t+1}) = \\
&\int ... \int p(x_{0:t+1}, m | z_{1:t+1}, u_{1:t+1})\ dx_{t}\ ...\ dx_0
\end{align*}
$$
Full SLAM의 값을 모두 더해서 구할 수 있다.

### Why is SLAM a Hard Problem 
1. Robot path and map are both **unknown**
	- 둘 중 하나가 정확하다면 다른 unkown data의 uncertainty가 줄어든다.  
	→ 반대로 말하면 둘 다 모르기 때문에 어려움을 의미

2. known vs. unknown correspondence
	- 우리가 보는 랜드마크들을 모두 unique하게 구별하는 것이 불가능함  
	→ 판단을 잘못하면 문제가 생긴다.

#### ∴ Data Association Problem
> data association : 간단히 설명하자면 로봇이 어떠한 pose가 있을 때, 볼 수 있는 landmark들을 매칭시키는 작업

- **Mapping between observations** and the **map is unknown**
	- 우리는 이것을 data association을 통해 uncertainty를 낮추려고 함
- Picking **wrong data associations** can have catastrophic consequences
	- 만약 data association이 잘못됐을 경우 robot이 움직이 모든 path에 대한 판단이 잘못될 수 있음

![why hard 3](why-hard-3.png)

### Three Traditional Paradigms
1. Kalman filter
	- to estimate robot position and the landmark position
2. Particle filter
	- get rid of the Gaussian assumption about the world
3. **Graph-Based**
	- least squares formulation
	- 요즘에 많이 사용됨
	- 강의에서 이 방법을 다룰 것임

### Motion and Observation Model
![motion observation model](motion-observation-model.png)

#### Motion Model
- describes the relative motion of the robot
- 이전 위치와 현재 움직임을 통해 현재 위치를 구한다.
$$
p(x_{t} | x_{t-1}, u_{t})
$$

#### Observation model
- relates measurements with the robot's pose
- 현재위치(와 map)을 이용해 landmark의 위치를 구한다.
$$
p(z_{t} | x_{t})
$$ -->
