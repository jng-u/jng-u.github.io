---
title: Convert YUV_420_888 to RGB in Android
description: convert YUV_420_888 to RGB in Android
date: '2022-06-25'
tags:
- OpenCV
- Android
published: true
---

### 문제
Android jni를 이용해서 카메라 데이터를 C++ OpenCV로 처리해주는 작업을 하는데 이미지가 아래와 같이 초록색 화면으로 나오는 것을 확인했다.
![YUV Error Image](/posts/yuv_rgb_convert/yuv_error_img.jpg)

#### 원래 사용한 방법
원래는 아래의 코드를 사용해 변환하였다.  
``` cpp
cv::Mat mYuv(height + height / 2, width, CV_8UC1, bufferY);
cv::Mat mRgba(height, width, CV_8UC4);
cv::cvtColor(mYuv, mRgba, cv::COLOR_YUV2RGBA_NV21);
```
[Android Developers](https://developer.android.com/reference/android/graphics/ImageFormat#YUV_420_888)를 보면 안드로이드에서 YUV_420_888로 카메라를 읽었을 때, pixel stride의 기본 값이 1인 것을 알 수 있다.
<!-- <p>
<ELink text="Android Developers" to="https://developer.android.com/reference/android/graphics/ImageFormat#YUV_420_888"/>를 보면 안드로이드에서 YUV_420_888로 카메라를 읽었을 때, pixel stride의 기본 값이 1인 것을 알 수 있다.
</p> -->

그러나 내 핸드폰 기종(S22)로 테스트 해봤을 때는 pixel stride가 2인 것을 확인할 수 있었고, 아마 이게 문제가 아닐까 예상된다.

### 해결
[Minhaz's Blog](https://blog.minhazav.dev/how-to-convert-yuv-420-sp-android.media.Image-to-Bitmap-or-jpeg/)의 코드를 참고하여 직접 값을 계산해 문제를 해결하였다. 
<!-- <p> 
<ELink text="Minhaz's Blog" to="https://blog.minhazav.dev/how-to-convert-yuv-420-sp-android.media.Image-to-Bitmap-or-jpeg/"/>의 코드를 참고하여 직접 값을 계산해 문제를 해결하였다. 
</p> -->

``` cpp
cv::Mat mRgba(height, width, CV_8UC4);
for (int y = 0; y < height; ++y) {
	for (int x = 0; x < width; ++x) {
		int yIndex = (y * rowStrideY) + (x * pixelStrideY);
		// Y plane should have positive values belonging to [0...255]
		int yValue = (bufferY[yIndex] & 0xff);

		int uvx = x / 2;
		int uvy = y / 2;
		// U/V Values are subsampled i.e. each pixel in U/V chanel in a
		// YUV_420 image act as chroma value for 4 neighbouring pixels
		int uvIndex = (uvy * rowStrideUV) +  (uvx * pixelStrideUV);

		// U/V values ideally fall under [-0.5, 0.5] range. To fit them into
		// [0, 255] range they are scaled up and centered to 128.
		// Operation below brings U/V values to [-128, 127].
		int uValue = (bufferU[uvIndex] & 0xff) - 128;
		int vValue = (bufferV[uvIndex] & 0xff) - 128;

		// Compute RGB values per formula above.
		int r = (int) (yValue + 1.370705f * vValue);
		int g = (int) (yValue - (0.698001f * vValue) - (0.337633f * uValue));
		int b = (int) (yValue + 1.732446f * uValue);
		r = std::clamp(r, 0, 255);
		g = std::clamp(g, 0, 255);
		b = std::clamp(b, 0, 255);

		mRgba.at<cv::Vec4b>(y, x) = cv::Vec4b(r, g, b, 255);
	}
}
```

### reference
1. https://developer.android.com/reference/android/graphics/ImageFormat#YUV_420_888
2. https://stackoverflow.com/questions/40885602/yuv-420-888-to-rgb-conversion
3. https://stackoverflow.com/questions/30510928/convert-android-camera2-api-yuv-420-888-to-rgb
4. https://stackoverflow.com/questions/60992469how-to-correctly-pass-yuv-420-888-image-buffer-from-java-through-jni-to-opencv
5. https://blog.minhazav.dev/how-to-convert-yuv-420-sp-android.media.Image-to-Bitmap-or-jpeg/
<!-- 1. <ELink to="https://developer.android.com/reference/android/graphics/ImageFormat#YUV_420_888" />
2. <ELink to="https://stackoverflow.com/questions/40885602/yuv-420-888-to-rgb-conversion" />
3. <ELink to="https://stackoverflow.com/questions/30510928/convert-android-camera2-api-yuv-420-888-to-rgb" />
1. <ELink to="https://stackoverflow.com/questions/60992469/how-to-correctly-pass-yuv-420-888-image-buffer-from-java-through-jni-to-opencv" />
1. <ELink to="https://blog.minhazav.dev/how-to-convert-yuv-420-sp-android.media.Image-to-Bitmap-or-jpeg/" /> -->