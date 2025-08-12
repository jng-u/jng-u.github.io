---
title: Plotly 3d plot camera synchronize in real time
description: Plotly 3d plot camera synchronize in real time
date: '2023-01-20'
tags:
- Plotly
- Python
published: true
---

### Why?

Plotly를 이용해서 2개의 3D mesh 데이터를 비교하고 싶은데, 카메라를 각각 컨트롤 해줘야해서 불편함

그래서 이를 동기화 시키는 방법을 찾아보니 `scene.on_change` 함수를 사용하거나 js에서 `plotly_relayout` 을 이용해 카메라의 위치를 맞춰줌 ([링크](https://community.plotly.com/t/synchronize-camera-across-3d-subplots/22236/2))

근데 문제는 이렇게 했을 경우 다움직이고, mouse up 이벤트가 발생할 때 카메라 위치를 맞춰줌

따라서 보기에 그렇게 편하지는 않음

### 코드 분석

#### Plotly.js

주피터 노트북에 visualize해주기 위해 개발을 하고 있었기 때문에 python이나 js상관이 없었는데, js로 하는게 좀 더 편해보여서 [plotly js](https://www.notion.so/Plotly-3d-plot-camera-synchronize-in-real-time-8f8f1cac981844509647d610ac57274f)를 뜯어봄

![](Untitled.png)

![](Untitled1.png)

→ mouseup 이벤트가 일어날 때 relayoutCallback을 부르고,  
mousemove이벤트에서는 relayoutCallback을 부르지 않음

![](Untitled2.png)

relayoutCallback 함수를 보면 mouseup 이벤트에서는 “plotly_relayout”을 발생,  
mousemove 이벤트에서는 “plotly_relayouting”을 발생함

#### 코드

[링크](https://community.plotly.com/t/synchronize-camera-across-3d-subplots/22236/2)의 답변 중에 js를 바탕으로 코드를 수정함

```python
f = make_subplots(rows=1, cols=2, specs=[[{'is_3d': True}, {'is_3d': True}]])

f.append_trace(cube1, 1, 1)
f.append_trace(cube2, 1, 2)

fig = go.FigureWidget(f)

### get the a div
div = plotly.offline.plot(fig, include_plotlyjs=False, output_type='div')
### retrieve the div id (you probably want to do something smarter here with beautifulsoup)
div_id = div.split('=')[1].split()[0].replace("'", "").replace('"', '')
### your custom JS code
js = '''
    <script>
    var gd = document.getElementById('{div_id}');
    var scene = gd._fullLayout.scene._scene
    var scene2 = gd._fullLayout.scene2._scene
    var draged_scene = scene
    var corresponding_scene = scene2

    var mousePosition = 0;
    document.getElementById(scene.id).addEventListener("mouseenter", function(){{ mousePosition=1; }});
    document.getElementById(scene.id).addEventListener("mouseout", function(){{ mousePosition=0; }});
    document.getElementById(scene2.id).addEventListener("mouseenter", function(){{ mousePosition=2; }});
    document.getElementById(scene2.id).addEventListener("mouseout", function(){{ mousePosition=0; }});

    scene.graphDiv.emit('plotly_relayout', 'scene.camera', scene.getCamera());
    scene2.graphDiv.emit('plotly_relayout', 'scene2.camera', scene2.getCamera());

    var callRelayout = function() {{
      var layout = gd.layout

      if(mousePosition == 1) {{
        draged_scene = scene
        corresponding_scene = scene2
      }} else if(mousePosition == 2) {{
        draged_scene = scene2
        corresponding_scene = scene
      }}
      
      var update = {{  }}
      update[draged_scene.id + '.camera'] = draged_scene.getCamera()
      if(draged_scene.fullSceneLayout.dragmode === false) return;
      draged_scene.saveLayout(layout);
      draged_scene.graphDiv.emit('plotly_relayout', update);
    }}

    gd.on('plotly_relayouting', () => {{
      callRelayout()
    }})

    var isUnderRelayout = false
    gd.on('plotly_relayout', () => {{
      if(!isUnderRelayout){{
        Plotly.relayout(gd, corresponding_scene.id + '.camera', draged_scene.getCamera())
          .then(() => {{ isUnderRelayout = false }}  )
      }}
      isUnderRelayout = true;
    }})</script>'''.format(div_id=div_id)
### merge everything
div = '<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>' + div + js
### show the plot 
IPython.core.display.HTML(div)
```

### 결과

원래

![](asdff.gif)

코드 변경 후

![Screen Recording 2023-01-22 at 1.07.51 PM.gif](Screen_Recording_2023-01-22_at_1.07.51_PM.gif)

### 참고

1. https://community.plotly.com/t/synchronize-camera-across-3d-subplots/22236/3
2. https://github.com/plotly/plotly.js/blob/623fcd1fea9d9bfb86e5e0d44d8047cd8636881c/src/plots/gl3d/scene.js
3. https://plotly.com/javascript/plotlyjs-function-reference/