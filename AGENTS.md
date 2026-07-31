# Procesure to follow before add and commit in git-hub :
1. run git status command 
2. check those file what changes happen in code
3. after that u can add and commit via sutaible comit type: name

# log formate
1. it should have \n in the startof every log and if it is the first log of the api route then it should hande double \n, like \n\n.
2. it should mention type of log like [ERROR], [INFO], [DATA], [REQUEST-PAYLOAD], [RESPONSE-PAYLOAD], [ENGINE-RESPONSE], etc.
3. in curve bracket it should mention the file name then have a ":"
4. then value 
5. example: console.log("\n> [ERROR] (main.ts) :", error.message);