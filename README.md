# vue2-element-plus-scrollbar

用 vue2 改写的 element-plus(vue3)/scrollbar


```html
<scrollbar height="200px;"> 
    <p class="item" v-for="item in 20" :key="item">{{ item }}</p>
</scrollbar>
```

## element-ui(vue2) 中内置 scrollbar

用法如下

```html
<el-scrollbar wrap-style="height:200px;"> 
    <p class="item" v-for="item in 20" :key="item">{{ item }}</p>
</el-scrollbar>
```
