const autocompleteInput = Vue.component('autocomplete-input', {
    template: '#template--autocomplete-input',
    props: {
      options: {
        type: Array,
        required: true
      },
      value: {
        type: String,
        // required: true
      }
    },
    data: () => ({
      isOpen: false,
      highlightedPosition: 0,
    }),
    computed: {
      fOptions() {
        const re = new RegExp(this.value, 'i')
        return this.options.filter(o => o.match(re))
      }
    },
    methods: {
      onInput(value) {
        this.highlightedPosition = 0
        this.isOpen = !!value
      },
      moveDown() {
        if (!this.isOpen) {
          return
        }
        this.highlightedPosition =
          (this.highlightedPosition + 1) % this.fOptions.length
      },
      moveUp() {
        if (!this.isOpen) {
          return
        }
        this.highlightedPosition = this.highlightedPosition - 1 < 0 ? this.fOptions.length - 1 : this.highlightedPosition - 1
      },
      select(event) {
        const selectedOption = this.fOptions[this.highlightedPosition]
        
        if (selectedOption) {
          this.value = selectedOption
        }
        
        this.$emit('select', this.value)
        this.isOpen = false
        event.target.blur()
      }
    }
  })
  
  const SpoilerWarning = Vue.component('spoiler-warning', {
    template: '#template--spoiler-warning',
    
    data: () => ({
      spoilersOK: null
    }),
    
    methods: {
      proceed() {
        this.$parent.spoilersConfirmed = true
        
        if (this.$parent.savedCharacters < 1) {
          this.$router.push({ name: 'game-instructions' })
        }
        else if (this.$parent.incompletedCharacters.length > 0) {
          this.$router.push({ name: 'character', params: { id: this.$parent.incompletedCharacters[0].id } })
        } else {
          this.$router.push({ name: 'predictions' })
        }
      }
    }
  })
  
  const GameInstructions = Vue.component('game-instructions', {
    template: '#template--game-instructions',
  })
  
  const Predictions = Vue.component('predictions', {
    template: '#template--predictions',  
    computed: {
      points() {
        let totalPoints = 0
  
        this.$parent.savedCharacters.forEach((character) => {
          let dbChar = this.$parent.characters.find(c => (c.name == character.name))
          
          if (dbChar) {
            if ((dbChar.status !== '' && dbChar.status == character.prediction) || (dbChar.status == '' && character.prediction == 'alive')) totalPoints++
            
            if (character.killer && dbChar.killer) {
              dbChar.killer.some((e) => { if (character.killer.toLowerCase() === e.toLowerCase()) totalPoints += 10 })
            }
          }
        })
    
        return totalPoints
      }
    }
  })
  
  const Character = Vue.component('character', {
    template: '#template--character',
    
    data: () => ({
      killer: '',
    }),
    
    mounted() {
      if (this.character.killer) this.killer = this.character.killer
    },
    
    watch: {
      killer(val) {
        this.character.killer = val
      }
    },
    
    computed: {
      character() {
        let incompleted = this.$parent.incompletedCharacters.find(character => character.id == this.$route.params.id),
            saved = this.$parent.savedCharacters.find(character => character.id == this.$route.params.id)
        
        if (incompleted) return incompleted
        
        else if (saved) return saved
        
        // character already dead before playing
        else return this.$parent.characters.find(character => character.id == this.$route.params.id)
      },
      
      inCompletedCharIndex() {
        return this.$parent.inCompletedCharIndex(this.$route.params.id)
      },
      
      characterFate() {
        let dbChar = this.$parent.characters.find(c => (c.name == this.character.name))
        
        if (dbChar && dbChar.status) return dbChar.status
      },
      
      characters() {
        // just ppl who have appeared in the show and have a name
        return this.$parent.gotData.filter(person => (person.TvSeries.length > 0 && person.Name != '' && !person.Died))
      },
      
      names() {
        let names = this.characters.map(person => person.Name)
        
        let aliases = this.characters.map(person => person.Aliases).reduce(function(a, b) {
            return a.concat(b);
        }, [])
        
        let gameCharacters = this.$parent.characters.map(person => person.name)
        
        let customs = ['Viserion','wight','Wight','White Walker','Night King','Nymeria','Lady Stoneheart']
               
        let combo = [...names,...aliases,...gameCharacters,...customs]
        
        // remove duplicates
        combo = [...new Set(combo)]
        
        return combo
      },
    },
    
    methods: {    
      save() {
        let completedIncompletedCharacters = this.$parent.incompletedCharacters.filter(character => character.prediction),
            allCharacters = [...this.$parent.savedCharacters,...completedIncompletedCharacters]
        
        this.$parent.savedCharacters = allCharacters
        
        let currentCharIndex = this.$parent.savedCharacters.map((char) => char.name).indexOf(this.character.name);
        this.$parent.savedCharacters[currentCharIndex] = this.character
  
        this.$router.push({name: 'predictions'})
      },
      
      onOptionSelect(option) {
        this.killer = option
      }
    }
  })
  
  const characterListItem = Vue.component('character-li', {
    template: '#template--character-li',
    props: ['character'],
    
    computed: {
      thisSavedChar() {
        return this.$root.savedCharacters.find(char => (char.name == this.character.name))
      },
      
      userPredictedStatus() {
        if (this.thisSavedChar) return this.thisSavedChar.prediction
      },
      
      userPredictedStatusCorrect() {
        if (this.thisSavedChar) {
          if (this.character.status == this.thisSavedChar.prediction || (this.character.status !== 'dead' && this.thisSavedChar.prediction == 'alive')) {
            return true
          } else if (this.character.status !== '' && this.character.status !== this.thisSavedChar.prediction) {
            return false
          }
        }
      },
      
      correctKiller() {
        let result = false
        
        if (this.thisSavedChar && this.thisSavedChar.killer && this.character.killer) {
          this.character.killer.some((e) => { if (this.thisSavedChar.killer.toLowerCase() === e.toLowerCase()) result = true }) 
        }
        
        return result
      },
      
      isFocusable() {
        let characterNeedsPrediction = this.$root.completedCharNames.indexOf(this.character.name) < 0 && this.character.status !== 'dead'
  
        if (this.thisSavedChar || characterNeedsPrediction) return true
      }
    },
    
    methods: {
      focusCharacter(index) {
        this.$router.push({name: 'character', params: { id: this.character.id }})
      }
    }
  })
  
  const Debug = Vue.component('debug', {
    template: '<pre>{{ $parent.savedCharacters }}</pre>'
  })
  
  const router = new VueRouter({
    routes: [
      { 
        name: 'spoiler-warning',
        path: '/',
        component: SpoilerWarning,
        meta: { depth: 0 },
      },
      { 
        name: 'game-instructions',
        path: '/game-instructions',
        component: GameInstructions,
        meta: { depth: 1 },
      },
      { 
        name: 'predictions',
        path: '/predictions',
        component: Predictions,
        meta: { depth: 2 },
      },
      { 
        name: 'character',
        path: '/character/:id',
        component: Character,
        meta: { depth: 3 },
      },
      {
        name: 'debug',
        path: '/debug',
        component: Debug
      }
    ]
  });
  
  Vue.use(VueRouter)
  
  new Vue({
    el: '#app',
    router,
  
    data: () => ({
      gotData: [],
      // characters: [],
      characterResults: [],
      savedCharacters: [],
      incompletedCharacters: [],
      focusedCharIndex: 0,
      transitionSlideDirection: 'slide-left',
      spoilersConfirmed: null
    }),
    
    computed: {
      characters() {
        if (this.spoilersConfirmed) return this.characterResults
        else return null
      },
      
      completedCharNames() {
        return this.savedCharacters.map(char => char.id)
      }
    },
    
    watch: {
      '$route' (to, from) {
        const toDepth = to.meta.depth
        const fromDepth = from.meta.depth
  
        this.transitionSlideDirection = toDepth < fromDepth ? 'slide-right' : 'slide-left'
        
        // duration of route transition 
        setTimeout(() => window.scrollTo(0, 0), 400);
      },
      
      '$route.params.id' (to, from) {
        if (this.$route.name == 'character') this.transitionSlideDirection = this.inCompletedCharIndex(from) > this.inCompletedCharIndex(to) ? 'slide-right' : 'slide-left'
      },
      
      savedCharacters(newData) {
        localStorage.setItem('gameOfThronesDeadpool', JSON.stringify(newData));
  
        this.incompletedCharacters = this.getIncompletedCharacters(this.characterResults)
      }
    },
    
    methods: {
      getIncompletedCharacters(source) {
        return source
          .filter(character => (this.completedCharNames.indexOf(character.id) < 0 && !character.status))
          .map(a => Object.assign({id: a.id}, a))
      },
      
      inCompletedCharIndex(id) {
        let incompletedIndex = this.incompletedCharacters.findIndex(character => character.id === id)
        
        return incompletedIndex
      }
    },
    
    mounted() {
      if (!this.spoilersConfirmed) {
        this.$router.push({name: 'spoiler-warning'})
      }
      
      let vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      this.incompletedCharacters = this.getIncompletedCharacters(this.characterResults)
  
      if (localStorage.gameOfThronesDeadpool) {
        this.savedCharacters = JSON.parse(localStorage.gameOfThronesDeadpool)
      }
      
      particlesJS("particles-js", {"particles":{"number":{"value":200,"density":{"enable":true,"value_area":800}},"color":{"value":"#ffffff"},"shape":{"type":"circle","stroke":{"width":0,"color":"#000000"},"polygon":{"nb_sides":5},"image":{"src":"img/github.svg","width":100,"height":100}},"opacity":{"value":1,"random":true,"anim":{"enable":false,"speed":1,"opacity_min":0.1,"sync":false}},"size":{"value":2,"random":true,"anim":{"enable":false,"speed":40,"size_min":0.1,"sync":false}},"line_linked":{"enable":false,"distance":150,"color":"#ffffff","opacity":0.5,"width":1},"move":{"enable":true,"speed":5,"direction":"bottom","random":false,"straight":false,"out_mode":"out","bounce":false,"attract":{"enable":false,"rotateX":600,"rotateY":1200}}},"interactivity":{"detect_on":"canvas","events":{"onhover":{"enable":false,"mode":"repulse"},"onclick":{"enable":false,"mode":"push"},"resize":true},"modes":{"grab":{"distance":400,"line_linked":{"opacity":1}},"bubble":{"distance":400,"size":40,"duration":2,"opacity":8,"speed":3},"repulse":{"distance":200,"duration":0.4},"push":{"particles_nb":4},"remove":{"particles_nb":2}}},"retina_detect":true})
    },
    
    created() {
      fetch('https://raw.githubusercontent.com/joakimskoog/AnApiOfIceAndFire/master/data/characters.json')
        .then((resp) => resp.json())
        .then((data) => {
          this.gotData = data
        })
  
  
  
  
  
  
  //
  
  //
  //
  
  //
  //
  //
  
  //                            /   \
  //   _                 )      ((   ))     (                  _
  //  (@)               /|\      ))_((     /|\                (@)  
  //  |-|`\            / | \    (/\|/\)   / | \             /`|-|
  //  |_| ------------/--|-voV---\`|'/--Vov-|--\--------------|_|
  //  |-|                  '^`   (o o)  '^`                   |-|
  //  | |                      _ `\Y/'                        | |
  //  |-|                   (_) |                             |-|
  //  | |    ___ _ __   ___  _| | ___  _ __                   | |
  //  |-|   / __| '_ \ / _ \| | |/ _ \' __|                   |-|
  //  | |   \__ \ |_) | (_) | | |  __/ |                      | |
  //  |-|   |___/ .__/ \___/|_|_|\___|_|     (_)              |-|
  //  | |       | | __      ____ _ _ __ _ __  _ _ __   __ _   | |
  //  |-|       |_| \ \ /\ / / _` | '__| '_ \| | '_ \ / _` |  |-|
  //  | |            \ V  V / (_| | |  | | | | | | | | (_| |  | |
  //  |-|             \_/\_/ \__,_|_|  |_| |_|_|_| |_|\__, |  |-|
  //  | |                                              __/ |  | |
  //  |-|                                             |___/   |-|
  //  |_|_____________________________________________________|_|
  //  |-|`/~                     ( (                       ~\`|-|
  //  (@)                        \ \                          (@)
  //                            `\ /'
  
  //
  //
  //
  
  //
  //
  
  //
  
  
  
  
  
  
      let characters = [
        {
          "IsFemale": true,
          "name": "Arya Stark",
          "status": "alive"
        },
        {
          "IsFemale": false,
          "name": "Beric Dondarrion",
          "status": "dead",
          "killer": ["wight","wights","white","whites"]
        },
        {
          "IsFemale": false,
          "name": "Bran Stark",
          "status": ""
        },
        {
          "IsFemale": true,
          "name": "Brienne of Tarth",
          "status": ""
        },
        {
          "IsFemale": false,
          "name": "Bronn",
          "status": ""
        },
        {
          "IsFemale": true,
          "name": "Cersei Lannister",
          "status": "dead"
        },
        {
          "IsFemale": true,
          "name": "Daenerys Targaryen",
          "status": "dead",
          "killer": ["john snow", "Aegon Targaryen"]
        },
        {
          "IsFemale": false,
          "name": "Davos Seaworth",
          "status": ""
        },
        {
          "IsFemale": false,
          "name": "Drogon",
          "status": ""
        },
        {
          "IsFemale": false,
          "name": "Euron Greyjoy",
          "status": "dead",
          "killer": ["Jaime Lannister"]
        },
        {
          "IsFemale": false,
          "name": "Gendry",
          "status": ""
        },
        {
          "IsFemale": false,
          "name": "Ghost",
          "status": ""
        },
        {
          "IsFemale": true,
          "name": "Gilly",
          "status": ""
        },
        {
          "IsFemale": false,
          "name": "Grey Worm",
          "status": ""
        },
        {
          "IsFemale": false,
          "name": "Jaime Lannister",
          "status": "dead"
        },
        {
          "IsFemale": false,
          "name": "Jon Snow",
          "status": ""
        },
        {
          "IsFemale": false,
          "name": "Jorah Mormont",
          "status": "dead",
          "killer": ["wight","wights","white","whites"]
        },
        {
          "IsFemale": true,
          "name": "Lyanna Mormont",
          "status": "dead",
          "killer": ["giant", "a giant"]
        },
        {
          "IsFemale": true,
          "name": "Melisandre",
          "status": "dead",
          "killer": ["melisandra"]
        },
        {
          "IsFemale": true,
          "name": "Missandei",
          "status": "dead",
          "killer": ["the mountain","sandor clegane"]
        },
        {
          "IsFemale": false,
          "name": "Podrick",
          "status": ""
        },
        {
          "IsFemale": false,
          "name": "Qyburn",
          "status": "dead",
          "killer": ["the mountain"]
        },
        {
          "IsFemale": false,
          "name": "Rhaegal",
          "status": "dead"
        },
        {
          "IsFemale": false,
          "name": "Samwell Tarly",
          "status": ""
        },
        {
          "IsFemale": true,
          "name": "Sansa Stark",
          "status": ""
        },
        {
          "IsFemale": false,
          "name": "The Hound",
          "status": "dead"
        },
        {
          "IsFemale": false,
          "name": "The Mountain",
          "status": "dead",
          "killer": ["the hound"]
        },
        {
          "IsFemale": false,
          "name": "The Night King",
          "status": "dead",
          "killer": ["arya Stark", "arya"]
        },
        {
          "IsFemale": false,
          "name": "Theon Greyjoy",
          "status": "dead",
          "killer": ["the night king","night king"]
        },
        {
          "IsFemale": false,
          "name": "Tormund Giantsbane",
          "status": ""
        },
        {
          "IsFemale": false,
          "name": "Tyrion Lannister",
          "status": ""
        },
        {
          "IsFemale": false,
          "name": "Varys",
          "status": "dead",
          "killer": ["drogon"]
        },
        {
          "IsFemale": true,
          "name": "Yara Greyjoy",
          "status": ""
        }
      ]
      
      this.characterResults = characters.map(char => Object.assign({id: char.name.replace(/[.]/g,'').replace(/ /g, '-').toLowerCase()}, char))
    },
  });
  