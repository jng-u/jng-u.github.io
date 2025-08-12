---
title: VINS-Mono IMU Preintegration
description: VINS-Mono IMU Preintegration
date: '2022-01-16'
tags:
- SLAM
- VINS-Mono
- IMU preintegration
published: true
---

### 시작

[VINS-Mono논문](https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=8421746)의 Appendix A “Quaternion-based IMU Preintegration”의 내용을 기반으로 하고, 다음의 논문들을 참조하여 작성하였습니다.

[1] Efficient Integration of Inertial Observation into Visual SLAM without Initialization

### Notation

- $(\cdot)^w$ : world frame, 중력의 방향은 world frame의 z축과 align되어 있습니다.
- $(\cdot)^b$ : body frame (IMU frame)
- $(\cdot)^c$ : camera frame
- $\mathbf{R}$ : rotation matrix
- $\mathbf{q}$ : Hamilton quaternion
    - 주로 state vector에 사용
    - 3D vector의 편한 회전 연산을 위해서 사용됨
- $\mathbf{q}_{b}^{w}, \mathbf{p}_{b}^{w}$ : rotation and translation from the body frame to the world frame
- $b_k$ : the body frame while taking the $k$th image
- $c_k$ : the camera frame while taking the $k$th image.
- $\otimes$ : represents the multiplication operation between two quaternions
- $\mathbf{g}^w = [0,0,g]^T$ : the gravity vector in the world frame
- $\hat{(\cdot)}$ : the noisy measurement or estimation of a certain quantity

### 정리

body frame에서 측정된 IMU 측정값은  acceleration bias $\mathbf{b}_a$, gyroscope bias $\mathbf{b}_w$, additive noise에 영향을 받는다. accelerometer와 gyroscope의 raw measurements $\hat{\bf{a}}, \hat{\boldsymbol{\omega}}$는 다음과 같이 표현할 수 있다.

$$
\begin{equation}
\begin{align*}
\hat{\mathbf{a}}_t &= 
\mathbf{a}_t + \mathbf{b}_{a_t} + \mathbf{R}^t_w\mathbf{g}^w + \mathbf{n}_a
\\
\hat{\boldsymbol{\omega}}_t &= 
\boldsymbol{\omega}_t + \mathbf{b}_{\omega_t} + \mathbf{n}_\omega 
\end{align*}
\end{equation}
$$

이 때, additive noise가 Gaussian white noise라고 가정한다. $\mathbf{n}_a \sim \mathcal{N}(\mathbf{0}, \boldsymbol{\sigma}^2_{a}),\ \mathbf{n}_\omega \sim \mathcal{N}(\mathbf{0}, \boldsymbol{\sigma}^2_\omega)$

Acceleration bias와 gyroscope bias의 모델은 random walk이고, derivatives는 Gaussian white noise이다. $\mathbf{n}_{b_a} \sim \mathcal{N}(\mathbf{0}, \boldsymbol{\sigma}^2_{b_a}), \ 
\mathbf{n}_{b_\omega} \sim \mathcal{N}(\mathbf{0}, \boldsymbol{\sigma}^2_{b_\omega})$

$$
\begin{equation}

\dot{\mathbf{b}}_{a_t} = \mathbf{n}_{b_a}
\quad
\dot{\mathbf{b}}_{\omega_t} = \mathbf{n}_{b_\omega}

\end{equation}
$$

프레임 $b_k, b_{k+1}$의 시간 정보인 $t_k, t_{k+1}$에 대하여, position, velocity, orientation state는 $[t_k, t_{k+1}]$의 time interval 동안 IMU 측정값에의해 propagate 될 수 있다.

$$
\begin{equation}
\begin{align*}
\mathbf{p}_{b_{k+1}}^{w} &= \mathbf{p}_{b_{k}}^{w} + \mathbf{v}_{b_{k}}^{w}\Delta t_k + 
&&\int\int_{t\in [t_k,t_{k+1}]} {\mathbf{R}_{t}^{w} ((\hat{\mathbf{a}}_t - \mathbf{b}_{a_t}-\mathbf{n}_a)-\mathbf{g}^w)dt^2}
\\
\mathbf{v}_{b_{k+1}}^{w} &= \mathbf{v}_{b_{k}}^{w} + 
&&\int_{t\in [t_k,t_{k+1}]} {\mathbf{R}_{t}^{w} ((\hat{\mathbf{a}}_t - \mathbf{b}_{a_t}-\mathbf{n}_a)-\mathbf{g}^w)dt}
\\
\mathbf{q}_{b_{k+1}}^{w} &= \mathbf{q}_{b_{k}}^{w} \otimes 
&&\int_{t\in [t_k,t_{k+1}]} {\frac{1}{2}\boldsymbol{\Omega} (\hat{\boldsymbol{\omega}}_t - \mathbf{b}_{\omega_t}-\mathbf{n}_\omega)\mathbf{q}_t^{b_k}dt}
\end{align*}
\end{equation}
$$

where

$$
\begin{equation}
\boldsymbol{\Omega}(\boldsymbol{\omega}) = \begin{bmatrix}
-\lfloor\boldsymbol{\omega}\rfloor_\times & -\boldsymbol{\omega} \\
-\boldsymbol{\omega}^T & 0
\end{bmatrix}, 
\lfloor\boldsymbol{\omega}\rfloor_\times = \begin{bmatrix}
0 & -\omega_z & \omega_y \\
\omega_z & 0 & -\omega_x \\
-\omega_y& \omega_x & 0 \\
\end{bmatrix}
\end{equation}
$$

$\Delta t_k$ is the duration between the time interval $[t_k, t_{k+1}]$.

IMU state propagation은 $b_k$ frame에서의 rotation, position, velocity가 필요하다는 것을 알 수 있다. state가 변하기 시작하면, 우리는 IMU 측정값을 repropagate 해야된다. optimization-based algorithm에서는 우리가 매번 pose를 보정하기 때문에 매번 repropagate을 해야된다. 이것은 컴퓨팅 리소스를 많이 사용하기 때문에 이를 피하기 위해 **preintegration algorithm**을 사용한다.

reference frame을 world frame에서 local frame $b_k$로 바꾼 후에, 우리는 linear acceleration $\hat{\bf{a}}$과 angular velocity $\hat{\boldsymbol{\omega}}$에 관련된 부분들을 preintegrate할 수 있습니다.

$$
\begin{equation}
\begin{align*}
\mathbf{R}_{w}^{b_k}\mathbf{p}_{b_{k+1}}^{w} &= \mathbf{R}_{w}^{b_k} \left( \mathbf{p}_{b_{k}}^{w} + \mathbf{v}_{b_{k}}^{w}\Delta t_k - \frac{1}{2}\mathbf{g}^w\Delta t_k^2 \right) + \boldsymbol{\alpha}_{b_{k+1}}^{b_k}
\\
\mathbf{R}_{w}^{b_k}\mathbf{v}_{b_{k+1}}^{w} &= \mathbf{R}_{w}^{b_k} \left(\mathbf{v}_{b_{k}}^{w} - \mathbf{g}^w\Delta t_k \right) + \boldsymbol{\beta}_{b_{k+1}}^{b_k}
\\
\mathbf{q}_{w}^{b_k} \otimes \mathbf{q}_{b_{k+1}}^{w} &= \boldsymbol{\gamma}_{b_{k+1}}^{b_k}
\end{align*}
\end{equation}
$$

where

$$
\begin{equation}
\begin{align*}
\boldsymbol{\alpha}_{b_{k+1}}^{b_k} &= \int\int_{t\in [t_k,t_{k+1}]} {\mathbf{R}_{t}^{b_k}(\hat{\mathbf{a}}_t - \mathbf{b}_{a_t} - \mathbf{n}_{a})dt^2}
\\
\boldsymbol{\beta}_{b_{k+1}}^{b_k} &= \int_{t\in [t_k,t_{k+1}]} {\mathbf{R}_{t}^{b_k}(\hat{\mathbf{a}}_t - \mathbf{b}_{a_t}- \mathbf{n}_{a})dt}
\\
\boldsymbol{\gamma}_{b_{k+1}}^{b_k} &= \int_{t\in [t_k,t_{k+1}]} {\frac{1}{2}\boldsymbol{\Omega}(\hat{\boldsymbol{\omega}}_t - \mathbf{b}_{\omega_t} - \mathbf{n}_{\omega})\gamma_{t}^{b_k}dt}
\end{align*}
\end{equation}
$$

$b_k$를 bias가 주어진 reference로 이용하여 preintegration term (5)이 IMU 측정 값만을 통해 구할 수 있다는 것을 알 수 있습니다. $\boldsymbol{\alpha}_{b_{k+1}}^{b_k}, \boldsymbol{\beta}_{b_{k+1}}^{b_k}, \boldsymbol{\gamma}_{b_{k+1}}^{b_k}$가 오직 IMU bias와 관련있고 $b_k, b_{k+1}$ frame에서의 다른 state와는 관련이 없는 것을 알 수 있습니다.

bias의 추정이 변할 때, 만약 변화가 작다면 $\boldsymbol{\alpha}_{b_{k+1}}^{b_k}, \boldsymbol{\beta}_{b_{k+1}}^{b_k}, \boldsymbol{\gamma}_{b_{k+1}}^{b_k}$를 bias에 대한 1차 근사를 통해 값을 적용하고, 변화가 크다면 repropagate 합니다. 이런 방법은 IMU 측정값에 대한 propagate을 반복적으로 하지 않기 때문에 optimization-based algorithms을 사용할 때 컴퓨팅 리소스를 상당히 절약합니다.

discrete-time implementation에 대하여 다양한 integration 방법들이 적용될 수 있습니다. (zero-order hold (Euler), first-order hold (midpoint), and higher order (RK4) integration...)

만약 zero-order hold discretization을 사용한다면 이 결과는 [19], [24]논문과 수치적으로 똑같습니다. zero-order hold discretization의 예를 들어보면 처음에 $\boldsymbol{\alpha}_{b_{k+1}}^{b_k}, \boldsymbol{\beta}_{b_{k+1}}^{b_k}$는 0이고, $\boldsymbol{\gamma}_{b_{k+1}}^{b_k}$는 identity quaternion입니다. (4)에 따른 $\alpha, \beta, \gamma$의 평균은 다음과 같이 step by step으로 propagate됩니다.

> additive noise $\mathbf{n}_{a}, \mathbf{n}_{\omega}$의 평균값은 0입니다.
> 
> 
> estimate된 preintegration 값은 $\hat{(\cdot)}$로 표기하겠습니다.
> 

$$
\begin{equation}
\begin{align*}
\hat{\boldsymbol{\alpha}}_{i+1}^{b_k} &= \hat{\boldsymbol{\alpha}}_{i}^{b_k} + \hat{\boldsymbol{\beta}}_{i}^{b_k}\delta t + \frac{1}{2}\mathbf{R}(\hat{\boldsymbol{\gamma}}_{i}^{b_k})(\hat{\mathbf{a}}_i-\mathbf{b}_{a_i}) \delta t^2
\\ \hat{\boldsymbol{\beta}}_{i+1}^{b_k} &= \hat{\boldsymbol{\beta}}_{i}^{b_k} + \mathbf{R}(\hat{\boldsymbol{\gamma}}_{i}^{b_k})(\hat{\mathbf{a}}_i-\mathbf{b}_{a_i}) \delta t
\\ \hat{\boldsymbol{\gamma}}_{i+1}^{b_k} &= \hat{\boldsymbol{\gamma}}_{i}^{b_k} \otimes \begin{bmatrix}
1 \\
\frac{1}{2} (\hat{\boldsymbol{\omega}}_i - \mathbf{b}_{\omega_i}) \delta t\end{bmatrix} 
\end{align*}
\end{equation}
$$

> $i$ 는 $[t_k, t_{k+1}]$사이에서 측정된 IMU의 측정 시점을 의미한다. $\delta t$는 IMU 값을 측정한 $i$와 $i+1$ 사이의 time interval이다.
> 

다음 covariance propagtaion을 처리합니다. 4D rotation quaternion $\gamma_t^{b_k}$가 overparameterized 되어있기 때문에, 우리는 error term을 평균 주변의 perturbation으로 정의합니다.

$$
\begin{equation}
\boldsymbol{\gamma}_{t}^{b_k}
\approx \hat{\boldsymbol{\gamma}}_{t}^{b_k} \otimes \begin{bmatrix}
1 \\
\frac{1}{2} \delta \boldsymbol{\theta}_{t}^{b_k}
\end{bmatrix} 
\end{equation}
$$

> $\delta \boldsymbol{\theta}_{t}^{b_k}$는 3D small perturbation입니다.
> 

(5)의 continuous-time dynamics of error terms을 다음과 같이 유도할 수 있습니다.

$$
\begin{equation}
\begin{align*}
{\left[\begin{array}{c}\delta \dot{\boldsymbol{\alpha }}^{b_k}_t \\ \delta \dot{\boldsymbol{\beta }}^{b_k}_t \\ \delta \dot{\boldsymbol{\theta }}^{b_k}_t \\ \delta \dot{\mathbf {b}}_{a_t} \\ \delta \dot{\mathbf {b}}_{w_t} \end{array}\right]}  =& 
{\left[\begin{array}{cccccc}0 & \mathbf {I} &0 & 0 & 0\\ 0 & 0 & -\mathbf {R}^{b_k}_t \lfloor \hat{\mathbf {a}}_t - \mathbf {b}_{a_t} \rfloor _{\times } & -\mathbf {R}^{b_k}_t & 0 \\ 0 & 0 & - \lfloor \hat{\boldsymbol{\omega }}_t-\mathbf {b}_{w_t} \rfloor _{\times } & 0 & - \mathbf {I} \\ 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 \end{array}\right]} {\left[\begin{array}{c}\delta {\boldsymbol{\alpha }}^{b_k}_t \\ \delta {\boldsymbol{\beta }}^{b_k}_t \\ \delta {\boldsymbol{\theta }}^{b_k}_t \\ \delta {\mathbf {b}}_{a_t} \\ \delta {\mathbf {b}}_{w_t} \end{array}\right]} 

\\
&+ {\left[\begin{array}{cccc}0 & 0 & 0 & 0\\ -\mathbf {R}^{b_k}_t & 0 & 0 & 0\\ 0 & -\mathbf {I} & 0 & 0\\ 0 & 0 & \mathbf {I} & 0\\ 0 & 0 & 0 & \mathbf {I} \end{array}\right]} {\left[\begin{array}{c}\mathbf {n}_{a}\\ \mathbf {n}_{w}\\ \mathbf {n}_{b_a}\\ \mathbf {n}_{b_w} \end{array}\right]} 

\\
=& \mathbf {F}_t \delta \mathbf {z}^{b_k}_t + \mathbf {G}_t \mathbf {n}_t. 

\end{align*}
\end{equation}
$$

zero-order hold discretization의 integration period동안 $\mathbf{F}_t$는 상수입니다. 따라서 주어진 $\delta t$에 대해 $\mathbf{F}_d = \exp(\mathbf{F}_t \delta t)$가 됩니다. exponential series를 확장하고, higher order term을 생략하여 $\mathbf{F}_d \approx \mathbf{I} + \mathbf{F}_t \delta t$을 얻을 수 있습니다. continuous-time noise covariance matrix $\mathbf{Q}_t = \mathrm{diag}(\boldsymbol{\sigma}_a^2, \boldsymbol{\sigma}_\omega^2, \boldsymbol{\sigma}_{b_a}^2, \boldsymbol{\sigma}_{b_\omega}^2)$에 대하여 discrete-time noise covariance matrix는 다음과 같이 계산됩니다.

$$
\begin{equation}
\begin{align*}
\mathbf {Q}_d &= \int _{0}^{\delta t} \mathbf {F}_d(\tau)\mathbf {G}_t\mathbf {Q}_t\mathbf {G}^T_t \mathbf {F}_d(\tau)^T 
\\
&= \delta t \mathbf {F}_d\mathbf {G}_t\mathbf {Q}_t\mathbf {G}^T_t \mathbf {F}_d^T  
\\
&\approx \delta t\mathbf {G}_t\mathbf {Q}_t\mathbf {G}^T_t
\end{align*}
\end{equation}
$$

Initial covariance $\mathbf{P}_{b_{k}}^{b_k} = 0$으로부터 covariance $\mathbf{P}_{b_{k+1}}^{b_k}$를 다음과 같이 propagate 합니다.

$$
\begin{equation}
\begin{align*} \mathbf {P}^{b_k}_{t+\delta t} = (\mathbf {I}+\mathbf {F}_t\delta t) \mathbf {P}^{b_k}_t (\mathbf {I}+\mathbf {F}_t\delta t)^T +& \delta t\mathbf {G}_t \mathbf {Q}_t {\mathbf {G}_t }^T \\ &t \in [k,k+1]\end{align*}
\end{equation}
$$

동시에 first-order Jacobian matrix 또한 initial Jacobian $\mathbf{J}_{b_k} = \mathbf{I}$를 이용해 다음과 같이 반복적으로 propagate될 수 있다.

$$
\begin{equation} \begin{aligned} \mathbf {J}_{t+\delta t} &= (\mathbf {I}+\mathbf {F}_t\delta t) \mathbf {J}_{t}, \ \ t \in [k,k+1]. \end{aligned}
\end{equation}
$$

위의 반복적은 formulation을 통해 covariance matrix $\mathbf{P}_{b_{k+1}}^{b_k}$과 $\mathbf{J}_{b_{k+1}}$을 얻을 수 있습니다. bias에 대한  $\boldsymbol{\alpha}_{b_{k+1}}^{b_k}, \boldsymbol{\beta}_{b_{k+1}}^{b_k}, \boldsymbol{\gamma}_{b_{k+1}}^{b_k}$의 1차 근사는 다음과 같이 쓰여집니다.

$$
\begin{equation}
\begin{align*}
\boldsymbol{\alpha}_{b_{k+1}}^{b_k} &\approx \hat{\boldsymbol{\alpha}}_{b_{k+1}}^{b_k} + \mathbf{J}_{b_a}^{\alpha} \delta \mathbf{b}_{a_k} + \mathbf{J}_{b_\omega}^{\alpha} \delta \mathbf{b}_{\omega_k}
\\ \boldsymbol{\beta}_{b_{k+1}}^{b_k} &\approx \hat{\boldsymbol{\beta}}_{b_{k+1}}^{b_k} + \mathbf{J}_{b_a}^{\beta} \delta \mathbf{b}_{a_k} + \mathbf{J}_{b_\omega}^{\beta} \delta \mathbf{b}_{\omega_k}
\\ \boldsymbol{\gamma}_{b_{k+1}}^{b_k}
&\approx \hat{\boldsymbol{\gamma}}_{b_{k+1}}^{b_k} \otimes \begin{bmatrix}
1 \\
\frac{1}{2} \mathbf{J}_{b_\omega}^{\gamma} \delta \mathbf{b}_{\omega_k}
\end{bmatrix} 
\end{align*}
\end{equation}
$$

> $\mathbf{J}_{b_a}^{\alpha}$는 위치가 $\frac{\delta \boldsymbol\alpha_{b_{k+1}}^{b^k}}{\delta \mathbf b_{a_k} }$인 $\mathbf{J}_{b_{k+1}}$의 subblock matrix 입니다.
> 
> 
> $\mathbf{J}_{b_\omega}^{\alpha}, \mathbf{J}_{b_a}^{\alpha}, \mathbf{J}_{b_a}^{\beta}, \mathbf{J}_{b_\omega}^{\beta}, \mathbf{J}_{b_\omega}^{\gamma}$에 대해서도 같은 의미가 적용됩니다.
> 

만약 bias estimation값이 조금 변경된다면 repropagation하는 대신 식 (11)을 이용해 preintegration 결과를 보정합니다.

이제 우리는 corresponding covariance $\mathbf{P}_{b_{k+1}}^{b_k}$ 값을 이용해 IMU 측정값 모델을 다음과 같이 작성할 수 있습니다.

$$
\begin{equation} {\left[\begin{array}{c}\hat{\boldsymbol{\alpha }}^{b_k}_{b_{k+1}}\\ \hat{\boldsymbol{\beta }}^{b_k}_{b_{k+1}}\\ \hat{\boldsymbol{\gamma }}^{b_k}_{b_{k+1}}\\ \mathbf {0}\\ \mathbf {0}\\ \end{array}\right]} = {\left[\begin{array}{c}\mathbf {R}^{b_k}_{w}(\mathbf {p}^{w}_{b_{k+1}} - \mathbf {p}^{w}_{b_k} + \frac{1}{2}\mathbf {g}^{w} \Delta t_k^2 - \mathbf {v}^{w}_{b_k} \Delta t_k) \\ \mathbf {R}^{b_k}_{w}(\mathbf {v}^{w}_{b_{k+1}} + \mathbf {g}^{w} \Delta t_k- \mathbf {v}^{w}_{b_k}) \\ \mathbf {q}^{w^{-1}}_{b_{k}} \otimes \mathbf {q}^{w}_{b_{k+1}}\\ {\mathbf {b}_a}_{b_{k+1}} - {\mathbf {b}_a}_{b_k}\\ {\mathbf {b}_w}_{b_{k+1}} -{\mathbf {b}_w}_{b_k}\\ \end{array}\right]}
\end{equation}
$$